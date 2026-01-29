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
  CategoryInfoDto,
} from '../dto/responses';
import {
  GetProvidersUseCase,
  ValidateAccountUseCase,
  PayBillUseCase,
  GetPaymentHistoryUseCase,
  GetReceiptUseCase,
} from '../usecases';
import { BillCategory } from '../../domain/types';

const CATEGORY_INFO: Record<
  BillCategory,
  { displayName: string; description: string; icon: string }
> = {
  electricity: {
    displayName: 'Electricity',
    description: 'Pay your electricity bills',
    icon: 'bolt',
  },
  water: {
    displayName: 'Water',
    description: 'Pay your water bills',
    icon: 'water_drop',
  },
  internet: {
    displayName: 'Internet',
    description: 'Pay for internet services',
    icon: 'wifi',
  },
  tv: {
    displayName: 'TV',
    description: 'Pay for cable and TV subscriptions',
    icon: 'tv',
  },
  phone_credit: {
    displayName: 'Phone Credit',
    description: 'Top up mobile phone credit',
    icon: 'phone_android',
  },
  insurance: {
    displayName: 'Insurance',
    description: 'Pay insurance premiums',
    icon: 'security',
  },
  education: {
    displayName: 'Education',
    description: 'Pay school fees and tuition',
    icon: 'school',
  },
  government: {
    displayName: 'Government',
    description: 'Pay government fees and taxes',
    icon: 'account_balance',
  },
};

@ApiTags('Bill Payments')
@Controller('bill-payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillPaymentController {
  constructor(
    private readonly getProvidersUseCase: GetProvidersUseCase,
    private readonly validateAccountUseCase: ValidateAccountUseCase,
    private readonly payBillUseCase: PayBillUseCase,
    private readonly getPaymentHistoryUseCase: GetPaymentHistoryUseCase,
    private readonly getReceiptUseCase: GetReceiptUseCase,
  ) {}

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
    return this.getProvidersUseCase.execute({
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
    const result = await this.getProvidersUseCase.execute({
      country: country as any,
    });

    const categories: CategoryInfoDto[] = result.availableCategories.map(
      (category) => ({
        category,
        ...CATEGORY_INFO[category],
        providerCount: result.providers.filter((p) => p.category === category)
          .length,
      }),
    );

    return { categories };
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
    return this.validateAccountUseCase.execute({
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

    return this.payBillUseCase.execute({
      userId: req.user.id,
      providerId: dto.providerId,
      accountNumber: dto.accountNumber,
      meterNumber: dto.meterNumber,
      customerName: dto.customerName,
      amount: dto.amount,
      currency: dto.currency,
      phone: dto.phone,
      email: dto.email,
      idempotencyKey,
    });
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
    return this.getPaymentHistoryUseCase.execute({
      userId: req.user.id,
      page: query.page,
      limit: query.limit,
      category: query.category,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
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
    return this.getReceiptUseCase.execute({
      userId: req.user.id,
      paymentId,
    });
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
    // Reuse receipt use case but return simplified response
    const receipt = await this.getReceiptUseCase.execute({
      userId: req.user.id,
      paymentId,
    });

    return {
      paymentId: receipt.paymentId,
      transactionId: receipt.paymentId,
      status: receipt.status,
      receiptNumber: receipt.receiptNumber,
      providerReference: receipt.providerReference,
      tokenNumber: receipt.tokenNumber,
      units: receipt.units,
      amount: receipt.amount,
      fee: receipt.fee,
      totalAmount: receipt.totalAmount,
      currency: receipt.currency,
      paidAt: receipt.paidAt,
    };
  }
}
