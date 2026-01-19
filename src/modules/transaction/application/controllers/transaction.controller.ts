import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
} from '../usecases';

@ApiTags('Transactions')
@Controller('wallet/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
    private readonly getDepositStatusUseCase: GetDepositStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['deposit', 'transfer_internal', 'transfer_external'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Returns transaction history',
    schema: {
      example: {
        transactions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            walletId: 'wallet-1',
            type: 'deposit',
            amount: 16.45,
            currency: 'USD',
            status: 'completed',
            createdAt: '2026-01-18T12:00:00.000Z',
            completedAt: '2026-01-18T12:05:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      },
    },
  })
  async getTransactions(
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: 'deposit' | 'transfer_internal' | 'transfer_external',
    @Query('status') status?: 'pending' | 'processing' | 'completed' | 'failed',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.getTransactionsUseCase.execute({
      userId: req.user.id,
      type,
      status,
      limit,
      offset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns transaction details',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        walletId: 'wallet-1',
        type: 'deposit',
        amount: 16.45,
        currency: 'USD',
        status: 'completed',
        yellowCardRef: 'yc_dep_1234567890',
        metadata: {
          sourceCurrency: 'XOF',
          sourceAmount: 10000,
          rate: 0.00166,
          fee: 150,
        },
        createdAt: '2026-01-18T12:00:00.000Z',
        completedAt: '2026-01-18T12:05:00.000Z',
      },
    },
  })
  async getTransaction(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.getTransactionUseCase.execute({
      userId: req.user.id,
      transactionId: id,
    });
  }

  @Get('deposit/:id/status')
  @ApiOperation({ summary: 'Get deposit status (live from payment provider)' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
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
  async getDepositStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.getDepositStatusUseCase.execute({
      userId: req.user.id,
      transactionId: id,
    });
  }
}
