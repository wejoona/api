/**
 * Deposit Webhook Controller
 *
 * SEPARATE controller for external payment provider webhooks.
 * NO JwtAuthGuard — providers authenticate via HMAC signature.
 *
 * Security layers:
 * 1. HMAC-SHA256 signature verification (X-Webhook-Signature header)
 * 2. IP whitelist check (optional, per provider)
 * 3. Replay protection via timestamp + nonce
 * 4. Rate limiting
 */
import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { DepositService } from '../services/deposit.service';

/** Provider-specific webhook secrets and allowed IPs */
interface ProviderWebhookConfig {
  secret: string;
  allowedIps?: string[];
  signatureHeader?: string;
}

@ApiTags('Deposit Webhooks')
@Controller('webhooks/deposit')
export class DepositWebhookController {
  private readonly logger = new Logger(DepositWebhookController.name);
  private readonly providerConfigs: Map<string, ProviderWebhookConfig>;
  private readonly replayWindow = 300; // 5 minutes
  private readonly processedNonces = new Set<string>();

  constructor(
    private readonly depositService: DepositService,
    private readonly configService: ConfigService,
  ) {
    // Load per-provider webhook secrets from config
    this.providerConfigs = new Map();

    const providers = ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI', 'BLNK'];
    for (const code of providers) {
      const secret = this.configService.get<string>(
        `WEBHOOK_SECRET_${code}`,
        // Fallback to global secret in dev
        this.configService.get<string>('WEBHOOK_SECRET', ''),
      );
      const ipsRaw = this.configService.get<string>(`WEBHOOK_IPS_${code}`, '');
      const allowedIps = ipsRaw ? ipsRaw.split(',').map((ip) => ip.trim()) : undefined;

      if (secret) {
        this.providerConfigs.set(code, {
          secret,
          allowedIps,
          signatureHeader: `x-webhook-signature`,
        });
      }
    }

    this.logger.log(
      `Webhook controller initialized with ${this.providerConfigs.size} provider configs`,
    );

    // Cleanup old nonces every 10 minutes
    setInterval(() => this.processedNonces.clear(), 600_000);
  }

  @Post(':providerCode')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle() // Providers may send bursts; we verify via signature instead
  @ApiOperation({
    summary: 'Receive deposit webhook from payment provider',
    description:
      'Endpoint for mobile money providers to notify of deposit status changes. ' +
      'Requires HMAC-SHA256 signature in X-Webhook-Signature header.',
  })
  @ApiParam({
    name: 'providerCode',
    description: 'Provider code',
    enum: ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI', 'BLNK'],
  })
  @ApiHeader({
    name: 'X-Webhook-Signature',
    description: 'HMAC-SHA256 signature of the request body',
    required: true,
  })
  @ApiHeader({
    name: 'X-Webhook-Timestamp',
    description: 'Unix timestamp of when the webhook was sent',
    required: false,
  })
  @ApiHeader({
    name: 'X-Webhook-Nonce',
    description: 'Unique nonce to prevent replay attacks',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Invalid payload or signature' })
  @ApiResponse({ status: 401, description: 'Signature verification failed' })
  async handleWebhook(
    @Param('providerCode') providerCode: string,
    @Body() payload: Record<string, any>,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Headers('x-webhook-timestamp') timestamp: string | undefined,
    @Headers('x-webhook-nonce') nonce: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Req() req: Request,
  ): Promise<{ status: string; message: string }> {
    const providerConfig = this.providerConfigs.get(providerCode.toUpperCase());

    // ── 1. Verify provider is configured ──
    if (!providerConfig) {
      // In dev mode without secrets, allow through with warning
      const isDev = this.configService.get<string>('nodeEnv') === 'development';
      if (isDev) {
        this.logger.warn(
          `DEV MODE: Accepting unsigned webhook for ${providerCode}`,
        );
        await this.depositService.handleWebhook(providerCode, payload);
        return { status: 'ok', message: 'Processed (dev mode, unsigned)' };
      }
      throw new BadRequestException(`Unknown provider: ${providerCode}`);
    }

    // ── 2. IP whitelist check ──
    if (providerConfig.allowedIps?.length) {
      const clientIp =
        forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';
      if (!providerConfig.allowedIps.includes(clientIp)) {
        this.logger.warn(
          `Webhook rejected: IP ${clientIp} not whitelisted for ${providerCode}`,
        );
        throw new UnauthorizedException('IP not authorized');
      }
    }

    // ── 3. Signature verification ──
    if (!signature) {
      throw new UnauthorizedException(
        'Missing X-Webhook-Signature header',
      );
    }

    const rawBody = JSON.stringify(payload);
    const signaturePayload = timestamp
      ? `${timestamp}.${rawBody}`
      : rawBody;

    const expectedSignature = crypto
      .createHmac('sha256', providerConfig.secret)
      .update(signaturePayload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      this.logger.warn(
        `Webhook signature mismatch for ${providerCode}`,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // ── 4. Replay protection ──
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > this.replayWindow) {
        throw new BadRequestException(
          'Webhook timestamp outside acceptable window',
        );
      }
    }

    if (nonce) {
      if (this.processedNonces.has(nonce)) {
        this.logger.warn(`Duplicate webhook nonce: ${nonce}`);
        return { status: 'ok', message: 'Already processed' };
      }
      this.processedNonces.add(nonce);
    }

    // ── 5. Process webhook ──
    this.logger.log(
      `Processing verified webhook from ${providerCode}`,
    );
    await this.depositService.handleWebhook(providerCode, payload);

    return { status: 'ok', message: 'Processed' };
  }
}
