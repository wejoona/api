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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { IdempotencyInterceptor } from '../../../../common/interceptors';
import {
  GetProvidersQueryDto,
  ValidateAccountDto,
  PayBillDto,
  GetPaymentHistoryQueryDto,
} from '../dto/requests';
import {
  GetProvidersResponseDto,
  ValidateAccountResponseDto,
  PayBillResponseDto,
  GetPaymentHistoryResponseDto,
  BillPaymentReceiptDto,
  GetCategoriesResponseDto,
} from '../dto/responses';
import { BillPayClientService } from '../../infrastructure/services/bill-pay-client.service';

@ApiTags('Bill Payments')
@Controller('bill-payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillPaymentController {
  constructor(private readonly billPayClient: BillPayClientService) {}

  // ============================================
  // PROVIDERS
  // ============================================

  @Get('providers')
  @ApiOperation({ summary: 'Get available bill payment providers' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of bill payment providers',
    type: GetProvidersResponseDto,
  })
  async getProviders(
    @Query() query: GetProvidersQueryDto,
  ): Promise<GetProvidersResponseDto> {
    return this.billPayClient.getProviders({
      country: query.country,
      category: query.category,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available bill categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of bill categories with metadata',
    type: GetCategoriesResponseDto,
  })
  async getCategories(
    @Query('country') country?: string,
  ): Promise<GetCategoriesResponseDto> {
    return this.billPayClient.getCategories(country);
  }

  // ============================================
  // VALIDATION
  // ============================================

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Validate customer account with provider' })
  @ApiResponse({
    status: 200,
    description: 'Returns account validation result',
    type: ValidateAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async validateAccount(
    @Body() dto: ValidateAccountDto,
  ): Promise<ValidateAccountResponseDto> {
    return this.billPayClient.lookupBill({
      providerId: dto.providerId,
      accountNumber: dto.accountNumber,
      meterNumber: dto.meterNumber,
    });
  }

  // ============================================
  // PAYMENTS
  // ============================================

  @Post('pay')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Pay a bill' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Unique key to prevent duplicate payments',
    required: false,
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Bill payment initiated/completed',
    type: PayBillResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or insufficient balance',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider or wallet not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate payment detected',
  })
  async payBill(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PayBillDto,
  ): Promise<PayBillResponseDto> {
    const idempotencyKey = req.headers['x-idempotency-key'] as
      | string
      | undefined;

    return this.billPayClient.payBill(
      req.user.id,
      {
        providerId: dto.providerId,
        accountNumber: dto.accountNumber,
        meterNumber: dto.meterNumber,
        customerName: dto.customerName,
        amount: dto.amount,
        currency: dto.currency,
        phone: dto.phone,
        email: dto.email,
      },
      idempotencyKey,
    );
  }

  // ============================================
  // HISTORY
  // ============================================

  @Get('history')
  @ApiOperation({ summary: 'Get bill payment history' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated bill payment history',
    type: GetPaymentHistoryResponseDto,
  })
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetPaymentHistoryQueryDto,
  ): Promise<GetPaymentHistoryResponseDto> {
    return this.billPayClient.listPayments(req.user.id, {
      page: query.page,
      limit: query.limit,
      category: query.category,
      status: query.status,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });
  }

  // ============================================
  // RECEIPTS
  // ============================================

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get bill payment receipt' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment receipt with QR code',
    type: BillPaymentReceiptDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found or receipt not available',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  async getReceipt(
    @Request() req: AuthenticatedRequest,
    @Param('id') paymentId: string,
  ): Promise<BillPaymentReceiptDto> {
    return this.billPayClient.getPayment(req.user.id, paymentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill payment details' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment details',
    type: PayBillResponseDto,
  })
  async getPayment(
    @Request() req: AuthenticatedRequest,
    @Param('id') paymentId: string,
  ): Promise<PayBillResponseDto> {
    return this.billPayClient.getPayment(req.user.id, paymentId);
  }
}
