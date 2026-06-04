import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { IdempotencyInterceptor } from '../../../../common/interceptors';
import { ProcessPaymentDto } from '../dto/requests';
import {
  ProcessPaymentResponse,
  MerchantAnalyticsResponse,
} from '../dto/responses';
import {
  ProcessMerchantPaymentUseCase,
  GetMerchantUseCase,
  GetMerchantAnalyticsUseCase,
} from '../usecases';

@ApiTags('Merchant Compatibility')
@Controller('merchant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MerchantCompatController {
  constructor(
    private readonly processMerchantPaymentUseCase: ProcessMerchantPaymentUseCase,
    private readonly getMerchantUseCase: GetMerchantUseCase,
    private readonly getMerchantAnalyticsUseCase: GetMerchantAnalyticsUseCase,
  ) {}

  @Post('payments')
  @UseGuards(JwtAuthGuard, PinVerificationGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Compatibility alias for POST /merchants/pay',
    description:
      'Supports older mobile clients that still call /merchant/payments.',
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /user/pin/verify',
    required: true,
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Unique key to prevent duplicate payments',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment completed successfully',
    type: ProcessPaymentResponse,
  })
  async processPaymentAlias(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ProcessPaymentDto,
  ): Promise<ProcessPaymentResponse> {
    return this.processMerchantPaymentUseCase.execute({
      customerId: req.user.id,
      qrData: dto.qrData,
      amount: dto.amount,
    });
  }

  @Get('qr')
  @ApiOperation({
    summary: 'Compatibility alias for current merchant QR',
    description:
      'Returns QR data for the authenticated user merchant account.',
  })
  async getCurrentMerchantQr(@Request() req: AuthenticatedRequest) {
    const merchant = await this.getMerchantUseCase.execute({
      userId: req.user.id,
    });

    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.displayName,
      qrCode: merchant.qrCode,
      qrCodeUrl: merchant.qrCodeUrl,
    };
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Compatibility dashboard for current merchant',
    description:
      'Returns current merchant profile and monthly analytics for older mobile provider paths.',
  })
  async getCurrentMerchantDashboard(
    @Request() req: AuthenticatedRequest,
  ): Promise<{
    merchant: Awaited<ReturnType<GetMerchantUseCase['execute']>>;
    analytics: MerchantAnalyticsResponse;
  }> {
    const merchant = await this.getMerchantUseCase.execute({
      userId: req.user.id,
    });
    const analytics = await this.getMerchantAnalyticsUseCase.execute({
      userId: req.user.id,
      merchantId: merchant.merchantId,
      period: 'month',
    });

    return { merchant, analytics };
  }
}
