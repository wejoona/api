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
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
} from '../usecases';
import { GetTransactionsQueryDto } from '../dto/requests';

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
  @ApiOperation({
    summary: 'Get transaction history with advanced filtering',
    description:
      'Returns paginated transaction history with support for type, status, date range, amount range, and text search filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered and paginated transaction history',
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
        total: 50,
        limit: 20,
        offset: 0,
        hasMore: true,
      },
    },
  })
  async getTransactions(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetTransactionsQueryDto,
  ) {
    return this.getTransactionsUseCase.execute({
      userId: req.user.id,
      type: query.type,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: query.limit,
      offset: query.offset,
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
