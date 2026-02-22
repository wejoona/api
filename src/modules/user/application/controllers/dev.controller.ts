/**
 * Dev Controller
 * Debug endpoints for development only
 *
 * ⚠️ WARNING: These endpoints should NEVER be exposed in production!
 */

import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocalVerificationStrategy } from '../../../verification/infrastructure/strategies/local-verification.strategy';
import { VerificationFacadeService } from '../../../verification/application/services/verification-facade.service';

@ApiTags('Dev (Development Only)')
@Controller('dev')
export class DevController {
  constructor(
    private readonly localStrategy: LocalVerificationStrategy,
    private readonly verificationFacade: VerificationFacadeService,
    private readonly configService: ConfigService,
  ) {}

  private ensureDevMode(): void {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (nodeEnv !== 'development') {
      throw new ForbiddenException(
        'This endpoint is only available in development mode',
      );
    }
  }

  /**
   * Get the current OTP for a phone number
   * DEV ONLY - for testing purposes
   */
  @Get('otp/:phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Get OTP for phone number' })
  @ApiResponse({ status: 200, description: 'OTP retrieved' })
  @ApiResponse({ status: 403, description: 'Not available in production' })
  async getOtp(@Param('phone') phone: string) {
    this.ensureDevMode();

    const debugInfo = await this.localStrategy.getOtpDebugInfo(phone);

    return {
      success: true,
      message: '⚠️ DEV ONLY - Do not expose in production',
      data: {
        phone,
        otp: debugInfo.otp,
        ttl: debugInfo.ttl,
        attempts: debugInfo.attempts,
        isLocked: debugInfo.isLocked,
        lockoutRemaining: debugInfo.lockoutRemaining,
        hint: debugInfo.otp
          ? `Use OTP: ${debugInfo.otp} (expires in ${debugInfo.ttl}s)`
          : 'No OTP found. Request one first.',
      },
    };
  }

  /**
   * Get dev configuration
   */
  @Get('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Get dev configuration' })
  @ApiResponse({ status: 200, description: 'Config retrieved' })
  async getDevConfig() {
    this.ensureDevMode();

    return {
      success: true,
      message: '⚠️ DEV ONLY',
      data: {
        nodeEnv: this.configService.get<string>('nodeEnv'),
        verificationStrategy: this.configService.get<string>('verification.strategy', 'local'),
        activeStrategy: this.verificationFacade.strategyName,
        otpExpiry: this.configService.get<number>('verification.local.expirySeconds', 300),
        otpLength: this.configService.get<number>('verification.local.otpLength', 6),
        smsProvider: this.configService.get<string>('sms.provider', 'mock'),
      },
    };
  }

  /**
   * Check if running in dev mode
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check dev mode status' })
  @ApiResponse({ status: 200, description: 'Status returned' })
  async getStatus() {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    const isDev = nodeEnv === 'development';

    return {
      success: true,
      data: {
        isDevelopment: isDev,
        nodeEnv,
        devEndpointsAvailable: isDev,
        warning: isDev
          ? '⚠️ Running in development mode - debug endpoints exposed'
          : '✅ Production mode - debug endpoints disabled',
      },
    };
  }
}
