import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  InitiateDepositDto,
  InternalTransferDto,
  ExternalTransferDto,
  GetRateDto,
  SubmitKycDto,
} from '../dto/requests';
import {
  GetBalanceUseCase,
  GetDepositChannelsUseCase,
  InitiateDepositUseCase,
  InternalTransferUseCase,
  ExternalTransferUseCase,
  GetRateUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
} from '../usecases';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly getDepositChannelsUseCase: GetDepositChannelsUseCase,
    private readonly initiateDepositUseCase: InitiateDepositUseCase,
    private readonly internalTransferUseCase: InternalTransferUseCase,
    private readonly externalTransferUseCase: ExternalTransferUseCase,
    private readonly getRateUseCase: GetRateUseCase,
    private readonly submitKycUseCase: SubmitKycUseCase,
    private readonly getKycStatusUseCase: GetKycStatusUseCase,
  ) {}

  // ============================================
  // BALANCE
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current wallet balance',
    schema: {
      example: {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        currency: 'USD',
        balances: [
          { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
        ],
      },
    },
  })
  async getBalance(@Request() req: AuthenticatedRequest) {
    return this.getBalanceUseCase.execute({ userId: req.user.id });
  }

  // ============================================
  // DEPOSIT (ON-RAMP)
  // ============================================

  @Get('deposit/channels')
  @ApiOperation({ summary: 'Get available deposit channels' })
  @ApiQuery({ name: 'currency', required: false, example: 'XOF' })
  @ApiResponse({
    status: 200,
    description: 'Returns available payment channels for deposits',
    schema: {
      example: {
        channels: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
            currency: 'XOF',
          },
        ],
      },
    },
  })
  async getDepositChannels(
    @Request() req: AuthenticatedRequest,
    @Query('currency') currency?: string,
  ) {
    return this.getDepositChannelsUseCase.execute({
      userId: req.user.id,
      currency,
    });
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a deposit (XOF → USD)' })
  @ApiResponse({
    status: 201,
    description: 'Returns payment instructions for the deposit',
    schema: {
      example: {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        amount: 10000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        fee: 150,
        estimatedAmount: 16.45,
        paymentInstructions: {
          type: 'mobile_money',
          provider: 'orange',
          accountNumber: '+2250700000000',
          reference: 'DEP-ABC12345',
          instructions: 'Send 10000 XOF to the number above...',
        },
        expiresAt: '2026-01-18T13:00:00.000Z',
      },
    },
  })
  async initiateDeposit(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InitiateDepositDto,
  ) {
    return this.initiateDepositUseCase.execute({
      userId: req.user.id,
      amount: dto.amount,
      sourceCurrency: dto.sourceCurrency,
      channelId: dto.channelId,
    });
  }

  // ============================================
  // TRANSFERS
  // ============================================

  @Post('transfer/internal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer to another user by phone number' })
  @ApiResponse({
    status: 200,
    description: 'Internal transfer completed',
    schema: {
      example: {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-2',
        toPhone: '+2250701234567',
        amount: 50,
        currency: 'USD',
        fee: 0,
        status: 'completed',
      },
    },
  })
  async internalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InternalTransferDto,
  ) {
    return this.internalTransferUseCase.execute({
      fromUserId: req.user.id,
      toPhone: dto.toPhone,
      amount: dto.amount,
      currency: dto.currency,
    });
  }

  @Post('transfer/external')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer to external wallet address (USDC)' })
  @ApiResponse({
    status: 200,
    description: 'External transfer initiated',
    schema: {
      example: {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        toAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 50,
        currency: 'USD',
        fee: 1.0,
        status: 'pending',
        estimatedArrival: '5-30 minutes',
      },
    },
  })
  async externalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ExternalTransferDto,
  ) {
    return this.externalTransferUseCase.execute({
      userId: req.user.id,
      toAddress: dto.toAddress,
      amount: dto.amount,
      currency: dto.currency,
      network: dto.network,
    });
  }

  // ============================================
  // RATES
  // ============================================

  @Get('rate')
  @ApiOperation({ summary: 'Get exchange rate quote' })
  @ApiQuery({ name: 'sourceCurrency', required: true, example: 'XOF' })
  @ApiQuery({ name: 'targetCurrency', required: true, example: 'USD' })
  @ApiQuery({ name: 'amount', required: true, example: 10000 })
  @ApiResponse({
    status: 200,
    description: 'Returns exchange rate and estimated conversion',
    schema: {
      example: {
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        sourceAmount: 10000,
        targetAmount: 16.6,
        fee: 150,
        expiresAt: '2026-01-18T12:05:00.000Z',
      },
    },
  })
  async getRate(@Query() query: GetRateDto) {
    return this.getRateUseCase.execute({
      sourceCurrency: query.sourceCurrency,
      targetCurrency: query.targetCurrency,
      amount: query.amount,
      direction: query.direction,
    });
  }

  // ============================================
  // KYC
  // ============================================

  @Get('kyc/status')
  @ApiOperation({ summary: 'Get KYC verification status' })
  @ApiResponse({
    status: 200,
    description: 'Returns current KYC status',
    schema: {
      example: {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        kycStatus: 'verified',
        providerStatus: 'verified',
        verifiedAt: '2026-01-18T12:00:00.000Z',
      },
    },
  })
  async getKycStatus(@Request() req: AuthenticatedRequest) {
    return this.getKycStatusUseCase.execute({ userId: req.user.id });
  }

  @Post('kyc/submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit KYC documents for verification' })
  @ApiResponse({
    status: 201,
    description: 'KYC submitted successfully',
    schema: {
      example: {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        kycStatus: 'pending',
        message: 'KYC submitted successfully. Verification pending.',
        submittedAt: '2026-01-18T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'KYC already submitted or verified',
  })
  async submitKyc(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubmitKycDto,
  ) {
    return this.submitKycUseCase.execute({
      userId: req.user.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      country: dto.country,
      idType: dto.idType,
      idNumber: dto.idNumber,
      idExpiryDate: dto.idExpiryDate,
      address: dto.address,
    });
  }
}
