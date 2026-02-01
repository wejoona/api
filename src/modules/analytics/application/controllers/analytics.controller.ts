import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsQueryDto, TimePeriod } from '../dto/analytics-query.dto';
import {
  IWalletRepository,
  WALLET_REPOSITORY,
} from '../../../wallet/domain/repositories/wallet.repository';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  @Get('spending-by-category')
  @ApiOperation({
    summary: 'Get spending breakdown by category',
    description:
      'Returns spending analytics grouped by category (Bills, Transfers, etc.) for the specified period.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis period',
    example: '2026-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis period',
    example: '2026-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    description:
      'Pre-defined time period (defaults to 3 months if not specified)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns spending breakdown by category',
    schema: {
      example: {
        categories: [
          {
            category: 'Bills',
            amount: 450.75,
            count: 15,
            percentage: 45.5,
          },
          {
            category: 'Transfers',
            amount: 300.0,
            count: 8,
            percentage: 30.3,
          },
          {
            category: 'Cash Out',
            amount: 240.0,
            count: 3,
            percentage: 24.2,
          },
        ],
        totalSpent: 990.75,
        period: {
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-31T23:59:59.999Z',
        },
      },
    },
  })
  async getSpendingByCategory(
    @Request() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    const walletId = await this.getWalletId(req.user.id);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.analyticsService.getSpendingByCategory(
      walletId,
      startDate,
      endDate,
      query.period,
    );
  }

  @Get('income-vs-expenses')
  @ApiOperation({
    summary: 'Get income vs expenses summary',
    description:
      'Returns income and expenses comparison with net flow for the specified period.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis period',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis period',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    description: 'Pre-defined time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns income vs expenses summary',
    schema: {
      example: {
        income: 2500.0,
        expenses: 990.75,
        netFlow: 1509.25,
        incomeTransactions: 5,
        expenseTransactions: 26,
      },
    },
  })
  async getIncomeVsExpenses(
    @Request() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    const walletId = await this.getWalletId(req.user.id);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.analyticsService.getIncomeVsExpenses(
      walletId,
      startDate,
      endDate,
      query.period,
    );
  }

  @Get('monthly-trends')
  @ApiOperation({
    summary: 'Get monthly income and expense trends',
    description:
      'Returns monthly breakdown of income, expenses, and net flow over the specified period.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis period',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis period',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    description: 'Pre-defined time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns monthly trends',
    schema: {
      example: {
        trends: [
          {
            month: '2025-11',
            income: 800.0,
            expenses: 320.5,
            netFlow: 479.5,
            transactionCount: 12,
          },
          {
            month: '2025-12',
            income: 850.0,
            expenses: 340.25,
            netFlow: 509.75,
            transactionCount: 14,
          },
          {
            month: '2026-01',
            income: 850.0,
            expenses: 330.0,
            netFlow: 520.0,
            transactionCount: 15,
          },
        ],
        period: {
          startDate: '2025-11-01T00:00:00.000Z',
          endDate: '2026-01-31T23:59:59.999Z',
        },
      },
    },
  })
  async getMonthlyTrends(
    @Request() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    const walletId = await this.getWalletId(req.user.id);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.analyticsService.getMonthlyTrends(
      walletId,
      startDate,
      endDate,
      query.period,
    );
  }

  @Get('top-recipients')
  @ApiOperation({
    summary: 'Get top transfer recipients',
    description:
      'Returns top recipients based on total amount sent during the specified period.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis period',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis period',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    description: 'Pre-defined time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns top recipients',
    schema: {
      example: {
        recipients: [
          {
            recipientName: 'Amadou Diallo',
            recipientPhone: '+225 07 12 34 56',
            amount: 450.0,
            count: 8,
            lastTransactionDate: '2026-01-28T10:30:00.000Z',
          },
          {
            recipientName: 'Fatou Traoré',
            recipientPhone: '+225 05 87 65 43',
            amount: 280.0,
            count: 5,
            lastTransactionDate: '2026-01-25T14:20:00.000Z',
          },
        ],
        period: {
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-31T23:59:59.999Z',
        },
      },
    },
  })
  async getTopRecipients(
    @Request() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    const walletId = await this.getWalletId(req.user.id);
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.analyticsService.getTopRecipients(
      walletId,
      startDate,
      endDate,
      query.period,
    );
  }

  private async getWalletId(userId: string): Promise<string> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }
    return wallet.id;
  }
}
