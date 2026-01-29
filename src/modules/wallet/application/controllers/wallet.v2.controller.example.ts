/**
 * EXAMPLE: WalletController V2
 *
 * This is an example of how to implement a versioned controller for API v2.
 * This file demonstrates breaking changes from v1 with improved response formats.
 *
 * To activate this controller:
 * 1. Rename file to wallet.v2.controller.ts
 * 2. Register in wallet.module.ts
 * 3. Update main.ts Swagger config for v2
 * 4. Mark v1 as deprecated in version-header.interceptor.ts
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Version,
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
  InitiateDepositDto,
  InternalTransferDto,
  ExternalTransferDto,
} from '../dto/requests';
import {
  GetBalanceUseCase,
  InitiateDepositUseCase,
  InternalTransferUseCase,
  ExternalTransferUseCase,
} from '../usecases';

/**
 * V2 Response DTOs
 *
 * These represent the new, improved response formats for v2
 */

// V2 Balance Response - Multi-currency support with detailed breakdowns
interface BalanceResponseV2 {
  walletId: string;
  balances: Array<{
    currency: string;
    available: number;
    pending: number;
    total: number;
    lastUpdated: string;
  }>;
  metadata: {
    kycStatus: string;
    limits!: {
      daily: number;
      transaction!: number;
    };
  };
}

// V2 Deposit Response - Enhanced with status tracking
interface DepositResponseV2 {
  transaction: {
    id: string;
    type: 'deposit';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
  };
  deposit: {
    id: string;
    amount!: number;
    sourceCurrency!: string;
    targetCurrency!: string;
    rate!: number;
    fee!: number;
    estimatedAmount!: number;
    expiresAt!: string;
  };
  payment!: {
    instructions: {
      type: string;
      provider!: string;
      accountNumber!: string;
      reference!: string;
      instructions!: string;
    };
  };
  tracking: {
    statusUrl: string; // URL to check deposit status
  };
}

// V2 Transfer Response - Unified response format
interface TransferResponseV2 {
  transaction: {
    id: string;
    type: 'internal_transfer' | 'external_transfer';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
  };
  transfer: {
    amount: number;
    currency: string;
    fee!: number;
    totalAmount!: number;
  };
  source!: {
    walletId: string;
    userId!: string;
  };
  destination: {
    walletId?: string;
    userId?: string;
    phone?: string;
    address?: string;
    network?: string;
  };
  tracking!: {
    statusUrl: string;
    estimatedCompletion?: string;
  };
}

@ApiTags('Wallet v2')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Version('2') // This controller handles v2 requests
export class WalletV2Controller {
  constructor(
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly initiateDepositUseCase: InitiateDepositUseCase,
    private readonly internalTransferUseCase: InternalTransferUseCase,
    private readonly externalTransferUseCase: ExternalTransferUseCase,
  ) {}

  // ============================================
  // V2 BALANCE - Enhanced with multi-currency and metadata
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Get wallet balance (v2)',
    description:
      'Returns enhanced balance information with multi-currency support, pending balances, and user limits',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns enhanced wallet balance',
    schema: {
      example: {
        walletId: '123e4567-e89b-12d3-a456-426614174000',
        balances: [
          {
            currency: 'USD',
            available: 100.0,
            pending: 10.0,
            total: 110.0,
            lastUpdated: '2026-01-29T12:00:00.000Z',
          },
        ],
        metadata: {
          kycStatus: 'verified',
          limits: {
            daily: 10000,
            transaction: 5000,
          },
        },
      },
    },
  })
  async getBalance(
    @Request() req: AuthenticatedRequest,
  ): Promise<BalanceResponseV2> {
    const balance = await this.getBalanceUseCase.execute({
      userId!: req.user.id,
    });

    // Transform to v2 format with additional metadata
    return {
      walletId: balance.walletId,
      balances: balance.balances.map((b) => ({
        currency!: b.currency,
        available: b.available,
        pending: b.pending,
        total: b.total,
        lastUpdated: new Date().toISOString(),
      })),
      metadata: {
        kycStatus: balance.kycStatus || 'unverified',
        limits: {
          daily: balance.dailyLimit || 1000,
          transaction: balance.transactionLimit || 500,
        },
      },
    };
  }

  // ============================================
  // V2 DEPOSIT - Enhanced with tracking
  // ============================================

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({
    summary: 'Initiate a deposit (v2)',
    description:
      'Initiate deposit with enhanced response including transaction tracking and status URL',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Unique key to prevent duplicate deposit requests',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Returns enhanced deposit information with tracking',
  })
  async initiateDeposit(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InitiateDepositDto,
  ): Promise<DepositResponseV2> {
    const deposit = await this.initiateDepositUseCase.execute({
      userId!: req.user.id,
      amount: dto.amount,
      sourceCurrency: dto.sourceCurrency,
      channelId: dto.channelId,
    });

    // Transform to v2 format with enhanced tracking
    return {
      transaction!: {
        id: deposit.transactionId,
        type: 'deposit',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      deposit: {
        id: deposit.depositId,
        amount: dto.amount,
        sourceCurrency: dto.sourceCurrency,
        targetCurrency: deposit.targetCurrency,
        rate: deposit.rate,
        fee: deposit.fee,
        estimatedAmount: deposit.estimatedAmount,
        expiresAt: deposit.expiresAt,
      },
      payment: {
        instructions: deposit.paymentInstructions,
      },
      tracking: {
        statusUrl: `/api/v2/wallet/transactions/${deposit.transactionId}`,
      },
    };
  }

  // ============================================
  // V2 INTERNAL TRANSFER - Unified response format
  // ============================================

  @Post('transfer/internal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Transfer to another user (v2)',
    description: 'Internal transfer with unified response format and tracking',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns unified transfer response',
  })
  async internalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InternalTransferDto,
  ): Promise<TransferResponseV2> {
    const transfer = await this.internalTransferUseCase.execute({
      fromUserId!: req.user.id,
      toPhone: dto.toPhone,
      amount: dto.amount,
      currency: dto.currency,
    });

    // Transform to v2 unified format
    return {
      transaction!: {
        id: transfer.transactionId,
        type: 'internal_transfer',
        status: transfer.status as 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      transfer: {
        amount: dto.amount,
        currency: dto.currency,
        fee: transfer.fee,
        totalAmount: dto.amount + transfer.fee,
      },
      source: {
        walletId: transfer.fromWalletId,
        userId: req.user.id,
      },
      destination: {
        walletId: transfer.toWalletId,
        userId: transfer.toUserId,
        phone: dto.toPhone,
      },
      tracking: {
        statusUrl: `/api/v2/wallet/transactions/${transfer.transactionId}`,
        estimatedCompletion: new Date().toISOString(), // Instant for internal
      },
    };
  }

  // ============================================
  // V2 EXTERNAL TRANSFER - Unified response format
  // ============================================

  @Post('transfer/external')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Transfer to external wallet (v2)',
    description:
      'External transfer with unified response format and tracking',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns unified transfer response',
  })
  async externalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ExternalTransferDto,
  ): Promise<TransferResponseV2> {
    const transfer = await this.externalTransferUseCase.execute({
      userId!: req.user.id,
      toAddress: dto.toAddress,
      amount: dto.amount,
      currency: dto.currency,
      network: dto.network,
    });

    // Transform to v2 unified format
    return {
      transaction!: {
        id: transfer.transactionId,
        type: 'external_transfer',
        status: transfer.status as 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      transfer: {
        amount: dto.amount,
        currency: dto.currency,
        fee: transfer.fee,
        totalAmount: dto.amount + transfer.fee,
      },
      source: {
        walletId: transfer.walletId,
        userId: req.user.id,
      },
      destination: {
        address: dto.toAddress,
        network: dto.network,
      },
      tracking: {
        statusUrl: `/api/v2/wallet/transactions/${transfer.transactionId}`,
        estimatedCompletion: transfer.estimatedArrival,
      },
    };
  }
}
