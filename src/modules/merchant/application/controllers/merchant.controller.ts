import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { IdempotencyInterceptor } from '../../../../common/interceptors';

import {
  RegisterMerchantDto,
  CreatePaymentRequestDto,
  ProcessPaymentDto,
  DecodeQrDto,
} from '../dto/requests';
import {
  MerchantResponse,
  MerchantSummaryResponse,
  PaymentRequestResponse,
  ProcessPaymentResponse,
  MerchantTransactionListResponse,
  MerchantAnalyticsResponse,
} from '../dto/responses';

import {
  RegisterMerchantUseCase,
  CreatePaymentRequestUseCase,
  ProcessMerchantPaymentUseCase,
  GetMerchantUseCase,
  GetMerchantByQrUseCase,
  GetMerchantAnalyticsUseCase,
  GetMerchantTransactionsUseCase,
  QrCodeService,
} from '../usecases';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantController {
  constructor(
    private readonly registerMerchantUseCase: RegisterMerchantUseCase,
    private readonly createPaymentRequestUseCase: CreatePaymentRequestUseCase,
    private readonly processMerchantPaymentUseCase: ProcessMerchantPaymentUseCase,
    private readonly getMerchantUseCase: GetMerchantUseCase,
    private readonly getMerchantByQrUseCase: GetMerchantByQrUseCase,
    private readonly getMerchantAnalyticsUseCase: GetMerchantAnalyticsUseCase,
    private readonly getMerchantTransactionsUseCase: GetMerchantTransactionsUseCase,
    private readonly qrCodeService: QrCodeService,
  ) {}

  // ============================================
  // MERCHANT REGISTRATION
  // ============================================

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as a merchant' })
  @ApiResponse({
    status: 201,
    description: 'Merchant registered successfully',
    type: MerchantResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'User does not have a wallet',
  })
  @ApiResponse({
    status: 409,
    description: 'User already has a merchant account or business name is taken',
  })
  async register(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegisterMerchantDto,
  ): Promise<MerchantResponse> {
    return this.registerMerchantUseCase.execute({
      userId: req.user.id,
      ...dto,
    });
  }

  // ============================================
  // MERCHANT PROFILE
  // ============================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my merchant profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns merchant profile',
    type: MerchantResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
  })
  async getMyMerchant(@Request() req: AuthenticatedRequest): Promise<MerchantResponse> {
    return this.getMerchantUseCase.execute({ userId: req.user.id });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant by ID' })
  @ApiParam({ name: 'id', description: 'Merchant ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns merchant details',
    type: MerchantResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
  })
  async getMerchantById(@Param('id') id: string): Promise<MerchantResponse> {
    return this.getMerchantUseCase.execute({ merchantId: id });
  }

  // ============================================
  // QR CODE
  // ============================================

  @Get(':id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant QR code' })
  @ApiParam({ name: 'id', description: 'Merchant ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns merchant QR code data',
    schema: {
      example: {
        merchantId: '123e4567-e89b-12d3-a456-426614174000',
        merchantName: 'Cafe Abidjan',
        qrCode: 'joonapay://pay?v=1&t=static&m=...',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/...',
      },
    },
  })
  async getMerchantQr(@Param('id') id: string) {
    const merchant = await this.getMerchantUseCase.execute({ merchantId: id });
    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.displayName,
      qrCode: merchant.qrCode,
      qrCodeUrl: merchant.qrCodeUrl,
    };
  }

  @Post('decode-qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decode and validate a merchant QR code' })
  @ApiResponse({
    status: 200,
    description: 'Returns decoded QR information',
    type: MerchantSummaryResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid QR code',
  })
  async decodeQr(@Body() dto: DecodeQrDto) {
    const merchantInfo = await this.getMerchantByQrUseCase.execute(dto.qrData);
    return {
      merchantId: merchantInfo.merchantId,
      displayName: merchantInfo.displayName,
      category: merchantInfo.category,
      isVerified: merchantInfo.isVerified,
      logoUrl: merchantInfo.logoUrl,
      qrType: merchantInfo.qrType,
      amount: merchantInfo.amount,
      requestId: merchantInfo.requestId,
    };
  }

  // ============================================
  // PAYMENT REQUESTS (DYNAMIC QR)
  // ============================================

  @Post(':id/payment-request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Create a payment request (dynamic QR)' })
  @ApiParam({ name: 'id', description: 'Merchant ID' })
  @ApiResponse({
    status: 201,
    description: 'Payment request created',
    type: PaymentRequestResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid amount or merchant not active',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to create payment requests for this merchant',
  })
  async createPaymentRequest(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreatePaymentRequestDto,
  ): Promise<PaymentRequestResponse> {
    return this.createPaymentRequestUseCase.execute({
      userId: req.user.id,
      merchantId: id,
      ...dto,
    });
  }

  // ============================================
  // PROCESS PAYMENT (CUSTOMER ENDPOINT)
  // ============================================

  @Post('pay')
  @UseGuards(JwtAuthGuard, PinVerificationGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Pay a merchant (scan to pay)' })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
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
  @ApiResponse({
    status: 400,
    description: 'Invalid QR code, insufficient balance, or merchant not accepting payments',
  })
  async processPayment(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ProcessPaymentDto,
  ): Promise<ProcessPaymentResponse> {
    return this.processMerchantPaymentUseCase.execute({
      customerId: req.user.id,
      qrData: dto.qrData,
      amount: dto.amount,
    });
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  @Get(':id/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant transaction history' })
  @ApiParam({ name: 'id', description: 'Merchant ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Returns merchant transactions',
    type: MerchantTransactionListResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this merchant transactions',
  })
  async getMerchantTransactions(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<MerchantTransactionListResponse> {
    return this.getMerchantTransactionsUseCase.execute({
      userId: req.user.id,
      merchantId: id,
      limit,
      offset,
    });
  }

  // ============================================
  // ANALYTICS
  // ============================================

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant sales analytics' })
  @ApiParam({ name: 'id', description: 'Merchant ID' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month', 'year'],
    example: 'month',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns merchant analytics',
    type: MerchantAnalyticsResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this merchant analytics',
  })
  async getMerchantAnalytics(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ): Promise<MerchantAnalyticsResponse> {
    return this.getMerchantAnalyticsUseCase.execute({
      userId: req.user.id,
      merchantId: id,
      period,
    });
  }
}
