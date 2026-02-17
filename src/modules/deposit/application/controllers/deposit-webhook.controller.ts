/**
 * Deposit Webhook Controller
 *
 * SEPARATE controller for external payment provider webhooks.
 * NO JwtAuthGuard — providers authenticate via HMAC signature or verification callback.
 *
 * Security layers:
 * 1. HMAC-SHA256 signature verification (for providers that support it)
 * 2. CinetPay: verify via /payment/check API call (no HMAC from CinetPay)
 * 3. IP whitelist check (optional, per provider)
 * 4. Replay protection via timestamp + nonce
 * 5. Rate limiting
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
  Optional,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { DepositService } from '../services/deposit.service';
import { CinetPayProvider } from '../../infrastructure/providers/cinetpay/cinetpay.provider';
import { YellowCardProvider } from '../../infrastructure/providers/yellowcard/yellowcard.provider';

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
    @Optional() private readonly cinetPayProvider?: CinetPayProvider,
    @Optional() private readonly yellowCardProvider?: YellowCardProvider,
  ) {
    // Load per-provider webhook secrets from config
    this.providerConfigs = new Map();

    const providers = ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI', 'BLNK', 'CINETPAY', 'YELLOWCARD'];
    for (const code of providers) {
      const secret = this.configService.get<string>(
        `WEBHOOK_SECRET_${code}`,
        this.configService.get<string>('WEBHOOK_SECRET', ''),
      );
      const ipsRaw = this.configService.get<string>(`WEBHOOK_IPS_${code}`, '');
      const allowedIps = ipsRaw ? ipsRaw.split(',').map((ip) => ip.trim()) : undefined;

      if (secret) {
        this.providerConfigs.set(code, {
          secret,
          allowedIps,
          signatureHeader: 'x-webhook-signature',
        });
      }
    }

    this.logger.log(
      `Webhook controller initialized with ${this.providerConfigs.size} provider configs`,
    );

    // Cleanup old nonces every 10 minutes
    setInterval(() => this.processedNonces.clear(), 600_000);
  }

  /**
   * CinetPay webhook endpoint.
   * CinetPay posts to notify_url with cpm_trans_id, cpm_trans_status, etc.
   * We verify by calling CinetPay's /payment/check API.
   */
  @Post('cinetpay')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'CinetPay payment notification webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleCinetPayWebhook(
    @Body() payload: Record<string, any>,
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`CinetPay webhook received: ${JSON.stringify(payload)}`);

    const transactionId = payload.cpm_trans_id;
    if (!transactionId) {
      throw new BadRequestException('Missing cpm_trans_id in CinetPay webhook');
    }

    if (!this.cinetPayProvider) {
      this.logger.error('CinetPay webhook received but provider not configured');
      throw new BadRequestException('CinetPay provider not configured');
    }

    // Verify by calling CinetPay API to check actual transaction status
    const { result } = await this.cinetPayProvider.verifyWebhookAndGetStatus(transactionId);

    this.logger.log(
      `CinetPay webhook verified for tx ${transactionId}: status=${result.status}`,
    );

    // Delegate to deposit service
    await this.depositService.handleWebhook('CINETPAY', {
      transactionId,
      status: result.status,
      providerReference: result.providerReference,
      failureReason: result.failureReason,
    });

    return { status: 'ok', message: 'Processed' };
  }

  /**
   * Yellow Card webhook endpoint.
   * Yellow Card sends HMAC-signed webhooks.
   */
  @Post('yellowcard')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'Yellow Card payment notification webhook' })
  @ApiHeader({ name: 'X-YC-Signature', description: 'HMAC-SHA256 signature', required: true })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleYellowCardWebhook(
    @Body() payload: Record<string, any>,
    @Headers('x-yc-signature') signature: string | undefined,
    @Req() req: Request,
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`Yellow Card webhook received: event=${payload.event}`);

    if (!this.yellowCardProvider) {
      this.logger.error('Yellow Card webhook received but provider not configured');
      throw new BadRequestException('Yellow Card provider not configured');
    }

    // Verify signature
    if (signature) {
      const rawBody = JSON.stringify(payload);
      const isValid = this.yellowCardProvider.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        this.logger.warn('Yellow Card webhook signature verification failed');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    } else {
      const isDev = this.configService.get<string>('nodeEnv') === 'development';
      if (!isDev) {
        throw new UnauthorizedException('Missing X-YC-Signature header');
      }
      this.logger.warn('DEV MODE: Accepting unsigned Yellow Card webhook');
    }

    const paymentId = payload.data?.id || payload.id;
    const eventStatus = payload.event || payload.status;

    if (!paymentId) {
      throw new BadRequestException('Missing payment ID in Yellow Card webhook');
    }

    // Determine status from event
    let status: 'success' | 'pending' | 'failed';
    switch (eventStatus?.toLowerCase()) {
      case 'payment.completed':
      case 'completed':
      case 'settled':
        status = 'success';
        break;
      case 'payment.failed':
      case 'failed':
      case 'cancelled':
      case 'expired':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    await this.depositService.handleWebhook('YELLOWCARD', {
      transactionId: paymentId,
      status,
      providerReference: paymentId,
      failureReason: status === 'failed' ? (payload.data?.statusMessage || eventStatus) : undefined,
    });

    return { status: 'ok', message: 'Processed' };
  }

  /**
   * Generic webhook endpoint for mock providers (OMCI, MTNCI, etc.).
   * Uses HMAC-SHA256 signature verification.
   */
  @Post(':providerCode')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Receive deposit webhook from payment provider',
    description:
      'Endpoint for mock/legacy providers. Requires HMAC-SHA256 signature.',
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
      throw new UnauthorizedException('Missing X-Webhook-Signature header');
    }

    const rawBody = JSON.stringify(payload);
    const signaturePayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;

    const expectedSignature = crypto
      .createHmac('sha256', providerConfig.secret)
      .update(signaturePayload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      this.logger.warn(`Webhook signature mismatch for ${providerCode}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // ── 4. Replay protection ──
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > this.replayWindow) {
        throw new BadRequestException('Webhook timestamp outside acceptable window');
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
    this.logger.log(`Processing verified webhook from ${providerCode}`);
    await this.depositService.handleWebhook(providerCode, payload);

    return { status: 'ok', message: 'Processed' };
  }
}
