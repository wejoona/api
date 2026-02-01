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
  UseInterceptors,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { IdempotencyInterceptor } from '../../../../common/interceptors';
import {
  InitiateDepositDto,
  InternalTransferDto,
  ExternalTransferDto,
  GetRateDto,
  SubmitKycDto,
  VerifyPinDto,
  SetPinDto,
  WithdrawDto,
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
  VerifyPinUseCase,
  SetPinUseCase,
  CreateWalletUseCase,
  GetWalletLimitsUseCase,
} from '../usecases';
import { WalletLimitsResponse } from '../dto/responses';
import { GetDepositStatusUseCase } from '../../../transaction/application/usecases';

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
    private readonly verifyPinUseCase: VerifyPinUseCase,
    private readonly setPinUseCase: SetPinUseCase,
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletLimitsUseCase: GetWalletLimitsUseCase,
    private readonly getDepositStatusUseCase: GetDepositStatusUseCase,
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

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/activate wallet for current user' })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        circleWalletId: '55c56c99-63f9-5426-ab08-10d40d196a8f',
        circleWalletAddress: '0x3ca7a6241ee8490dc847b3ee9635b4ecfe9f9bc5',
        currency: 'USDC',
        balance: 0,
        status: 'active',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet already exists',
  })
  async createWallet(@Request() req: AuthenticatedRequest) {
    const wallet = await this.createWalletUseCase.execute({
      userId: req.user.id,
      userPhone: req.user.phone,
    });
    return {
      id: wallet.id,
      userId: wallet.userId,
      circleWalletId: wallet.circleWalletId,
      circleWalletAddress: wallet.circleWalletAddress,
      currency: wallet.currency,
      balance: wallet.balance,
      status: wallet.status,
    };
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
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Initiate a deposit (XOF → USD)' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description:
      'Unique key to prevent duplicate deposit requests (e.g., UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
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
  // DEPOSIT ALIAS ROUTES (Mobile SDK compatibility)
  // ============================================
  // NOTE: More specific routes (deposit/providers) must come BEFORE parameterized routes (deposit/:id)

  @Get('deposit/providers')
  @ApiOperation({
    summary: 'Get deposit providers (alias for /deposit/channels)',
    description:
      'Alias route for mobile SDK compatibility. Transforms channels response to providers format.',
  })
  @ApiQuery({ name: 'currency', required: false, example: 'XOF' })
  @ApiResponse({
    status: 200,
    description: 'Returns available deposit providers',
    schema: {
      example: {
        providers: [
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            logo: 'https://example.com/orange.png',
            minAmount: 500,
            maxAmount: 1000000,
            fee: 0.0,
            feeType: 'percentage',
            countries: ['CI', 'SN', 'ML'],
          },
        ],
      },
    },
  })
  async getDepositProvidersAlias(
    @Request() req: AuthenticatedRequest,
    @Query('currency') currency?: string,
  ) {
    const result = await this.getDepositChannelsUseCase.execute({
      userId: req.user.id,
      currency,
    });

    // Transform channels to providers format for mobile SDK
    return {
      providers: result.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        logo: `https://example.com/${channel.provider}.png`, // You can enhance this with actual logo URLs
        minAmount: channel.minAmount,
        maxAmount: channel.maxAmount,
        fee: channel.fee,
        feeType: channel.feeType,
        countries: [channel.country],
      })),
    };
  }

  @Get('deposit/:id')
  @ApiOperation({
    summary: 'Get deposit status (alias for /transactions/deposit/:id/status)',
    description:
      'Alias route for mobile SDK compatibility. Delegates to the transaction controller implementation.',
  })
  @ApiParam({ name: 'id', description: 'Transaction/Deposit ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns deposit status with payment details',
    schema: {
      example: {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        depositId: 'dep_1234567890',
        status: 'pending',
        amount: 16.45,
        sourceCurrency: 'XOF',
        targetCurrency: 'USD',
        rate: 0.00166,
        fee: 150,
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: null,
      },
    },
  })
  async getDepositStatusAlias(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.getDepositStatusUseCase.execute({
      userId: req.user.id,
      transactionId: id,
    });
  }

  @Get('exchange-rate')
  @ApiOperation({
    summary: 'Get exchange rate (alias for /rate)',
    description:
      'Alias route for mobile SDK compatibility. Delegates to the rate endpoint.',
  })
  @ApiQuery({ name: 'sourceCurrency', required: true, example: 'XOF' })
  @ApiQuery({ name: 'targetCurrency', required: true, example: 'USD' })
  @ApiQuery({ name: 'amount', required: true, example: 10000 })
  @ApiResponse({
    status: 200,
    description: 'Returns exchange rate',
    schema: {
      example: {
        fromCurrency: 'XOF',
        toCurrency: 'USD',
        rate: 600.0,
        timestamp: '2026-01-30T12:00:00.000Z',
      },
    },
  })
  async getExchangeRateAlias(@Query() query: GetRateDto) {
    const result = await this.getRateUseCase.execute({
      sourceCurrency: query.sourceCurrency,
      targetCurrency: query.targetCurrency,
      amount: query.amount,
      direction: query.direction,
    });

    // Transform to mobile SDK format
    return {
      fromCurrency: result.sourceCurrency,
      toCurrency: result.targetCurrency,
      rate: result.sourceAmount / result.targetAmount, // Inverse rate (1 USD = X XOF)
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // TRANSFERS
  // ============================================

  @Post('transfer/internal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Transfer to another user by phone number' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description:
      'Unique key to prevent duplicate transfer requests (e.g., UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
    required: true,
    example: 'abc123...',
  })
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
  @ApiResponse({
    status: 400,
    description: 'PIN verification required',
    schema: {
      example: {
        message: 'PIN verification required for this operation',
        code: 'PIN_REQUIRED',
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
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Transfer to external wallet address (USDC)' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description:
      'Unique key to prevent duplicate transfer requests (e.g., UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
    required: true,
    example: 'abc123...',
  })
  @ApiResponse({
    status: 200,
    description: 'External transfer initiated',
    schema: {
      example: {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        toAddress: '0x1234567890abcdef1234567890abcdef12345678',
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 50,
        currency: 'USD',
        fee: 1.0,
        status: 'pending',
        network: 'polygon',
        txHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        estimatedArrival: '5-30 minutes',
        timestamp: '2026-01-30T12:00:00.000Z',
        createdAt: '2026-01-30T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'PIN verification required',
    schema: {
      example: {
        message: 'PIN verification required for this operation',
        code: 'PIN_REQUIRED',
      },
    },
  })
  async externalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ExternalTransferDto,
  ) {
    const result = await this.externalTransferUseCase.execute({
      userId: req.user.id,
      toAddress: dto.getAddress(),
      amount: dto.amount,
      currency: dto.currency,
      network: dto.network,
    });

    // Format response to match mobile SDK expectations
    const now = new Date();
    return {
      transactionId: result.transactionId,
      id: result.transactionId,
      walletId: result.walletId,
      toAddress: result.toAddress,
      recipientAddress: result.toAddress,
      amount: result.amount,
      currency: result.currency,
      fee: result.fee,
      status: result.status,
      network: dto.network || 'polygon',
      txHash: result.txHash,
      estimatedArrival: result.estimatedArrival,
      timestamp: now.toISOString(),
      createdAt: now.toISOString(),
    };
  }

  @Get('transfer/external/estimate-fee')
  @ApiOperation({ summary: 'Estimate network fee for external transfer' })
  @ApiQuery({
    name: 'network',
    required: false,
    example: 'polygon',
    description: 'Blockchain network (defaults to polygon)',
    enum: ['polygon', 'ethereum', 'base', 'arbitrum', 'avalanche'],
  })
  @ApiQuery({
    name: 'amount',
    required: false,
    example: 50,
    description:
      'Transfer amount in USD (optional, for more accurate estimates)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns estimated network fee',
    schema: {
      example: {
        network: 'polygon',
        estimatedFee: 0.01,
        estimatedTime: '1-2 minutes',
        currency: 'USD',
      },
    },
  })
  async estimateExternalTransferFee(
    @Query('network') network?: string,
    @Query('amount') amount?: number,
  ) {
    const networkName = network || 'polygon';

    // Network-based fee estimates
    // These are approximations - in production, you might query the payment gateway
    const feeEstimates: Record<string, { fee: number; time: string }> = {
      polygon: { fee: 0.01, time: '1-2 minutes' },
      ethereum: { fee: 2.5, time: '5-10 minutes' },
      base: { fee: 0.05, time: '2-3 minutes' },
      arbitrum: { fee: 0.1, time: '2-5 minutes' },
      avalanche: { fee: 0.15, time: '2-3 minutes' },
    };

    const estimate =
      feeEstimates[networkName.toLowerCase()] || feeEstimates.polygon;

    return {
      network: networkName,
      estimatedFee: estimate.fee,
      estimatedTime: estimate.time,
      currency: 'USD',
    };
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Withdraw USDC to external wallet address' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description:
      'Unique key to prevent duplicate withdrawal requests (e.g., UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
    required: true,
    example: 'abc123...',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal initiated successfully',
    schema: {
      example: {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 50.0,
        destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'polygon',
        fee: 0.25,
        status: 'pending',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'PIN verification required or invalid request',
    schema: {
      example: {
        message: 'PIN verification required for this operation',
        code: 'PIN_REQUIRED',
      },
    },
  })
  async withdraw(
    @Request() req: AuthenticatedRequest,
    @Body() dto: WithdrawDto,
  ) {
    const result = await this.externalTransferUseCase.execute({
      userId: req.user.id,
      toAddress: dto.destinationAddress,
      amount: dto.amount,
      currency: 'USD',
      network: dto.network || 'polygon',
    });

    // Format response to match mobile SDK expectations
    return {
      transactionId: result.transactionId,
      amount: result.amount,
      destinationAddress: result.toAddress,
      network: dto.network || 'polygon',
      fee: result.fee,
      status: result.status,
    };
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
      documentFrontKey: dto.documentFrontKey,
      documentBackKey: dto.documentBackKey,
      selfieKey: dto.selfieKey,
    });
  }

  // ============================================
  // PIN MANAGEMENT
  // ============================================

  @Post('pin/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Verify PIN for transaction authorization' })
  @ApiResponse({
    status: 200,
    description:
      'PIN verified successfully. Returns a token valid for 5 minutes.',
    schema: {
      example: {
        valid: true,
        message: 'PIN verified successfully',
        pinToken: 'abc123...',
        expiresIn: 300,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid PIN or PIN not set',
    schema: {
      example: {
        message: 'Invalid PIN',
        remainingAttempts: 3,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'PIN locked due to too many failed attempts',
    schema: {
      example: {
        message: 'PIN is locked due to too many failed attempts',
        lockedUntil: '2026-01-18T13:00:00.000Z',
      },
    },
  })
  async verifyPin(
    @Request() req: AuthenticatedRequest,
    @Body() dto: VerifyPinDto,
  ) {
    return this.verifyPinUseCase.execute({
      userId: req.user.id,
      pin: dto.pin,
    });
  }

  @Post('pin/set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or update transaction PIN' })
  @ApiResponse({
    status: 200,
    description: 'PIN set successfully',
    schema: {
      example: {
        success: true,
        message: 'PIN set successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid PIN or PINs do not match',
  })
  async setPin(@Request() req: AuthenticatedRequest, @Body() dto: SetPinDto) {
    return this.setPinUseCase.execute({
      userId: req.user.id,
      pin: dto.pin,
      confirmPin: dto.confirmPin,
    });
  }

  // ============================================
  // LIMITS
  // ============================================

  @Get('limits')
  @ApiOperation({ summary: 'Get wallet transaction limits based on KYC tier' })
  @ApiResponse({
    status: 200,
    description: 'Returns current limits and usage',
    type: WalletLimitsResponse,
    schema: {
      example: {
        dailyLimit: 500.0,
        monthlyLimit: 2000.0,
        singleTransactionLimit: 500.0,
        withdrawalLimit: 500.0,
        dailyUsed: 420.0,
        monthlyUsed: 1250.0,
        kycTier: 1,
        tierName: 'Basic',
        nextTierName: 'Verified',
        nextTierDailyLimit: 2000.0,
        nextTierMonthlyLimit: 10000.0,
        resetTime: '2026-01-31T00:00:00.000Z',
        hoursUntilReset: 12,
        minutesUntilReset: 30,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User or wallet not found',
  })
  async getLimits(@Request() req: AuthenticatedRequest) {
    return this.getWalletLimitsUseCase.execute({ userId: req.user.id });
  }
}
