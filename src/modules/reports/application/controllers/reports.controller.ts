import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import {
  ReportsService,
  DateRange,
  TransactionSummary,
  DailyTransactionReport,
  UserActivityReport,
  ReconciliationReport,
} from '../services/reports.service';

class DateRangeQueryDto {
  startDate?: string;
  endDate?: string;
}

class ExportQueryDto {
  startDate: string;
  endDate: string;
  format?: 'json' | 'csv';
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseDateRange(query: DateRangeQueryDto): DateRange | undefined {
    if (!query.startDate && !query.endDate) {
      return undefined;
    }

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return { startDate, endDate };
  }

  private parseRequiredDateRange(query: {
    startDate: string;
    endDate: string;
  }): DateRange {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO 8601 format.',
      );
    }

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return { startDate, endDate };
  }

  // ==========================================
  // Transaction Reports
  // ==========================================

  @Get('transactions/summary')
  @Roles('admin')
  @ApiOperation({ summary: 'Get transaction summary statistics' })
  @ApiResponse({ status: 200, description: 'Transaction summary retrieved' })
  async getTransactionSummary(
    @Query() query: DateRangeQueryDto,
  ): Promise<TransactionSummary> {
    const dateRange = this.parseDateRange(query);
    return this.reportsService.getTransactionSummary(dateRange);
  }

  @Get('transactions/daily')
  @Roles('admin')
  @ApiOperation({ summary: 'Get daily transaction report' })
  @ApiResponse({
    status: 200,
    description: 'Daily transaction report retrieved',
  })
  async getDailyTransactionReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<{ data: DailyTransactionReport[] }> {
    const dateRange = this.parseRequiredDateRange({ startDate, endDate });
    const data = await this.reportsService.getDailyTransactionReport(dateRange);
    return { data };
  }

  // ==========================================
  // User Activity Reports
  // ==========================================

  @Get('users/top')
  @Roles('admin')
  @ApiOperation({ summary: 'Get top users by transaction volume' })
  @ApiResponse({ status: 200, description: 'Top users report retrieved' })
  async getTopUsersByVolume(
    @Query() query: DateRangeQueryDto,
    @Query('limit') limit?: number,
  ): Promise<{ data: UserActivityReport[] }> {
    const dateRange = this.parseDateRange(query);
    const data = await this.reportsService.getTopUsersByVolume(
      dateRange,
      limit || 20,
    );
    return { data };
  }

  @Get('users/:userId/activity')
  @Roles('admin')
  @ApiOperation({ summary: 'Get activity summary for a specific user' })
  @ApiResponse({ status: 200, description: 'User activity summary retrieved' })
  async getUserActivitySummary(
    @Param('userId') userId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    const dateRange = this.parseDateRange(query);
    return this.reportsService.getUserActivitySummary(userId, dateRange);
  }

  // ==========================================
  // Reconciliation Reports
  // ==========================================

  @Get('reconciliation')
  @Roles('admin')
  @ApiOperation({ summary: 'Get reconciliation report for a date range' })
  @ApiResponse({ status: 200, description: 'Reconciliation report retrieved' })
  async getReconciliationReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ReconciliationReport> {
    const dateRange = this.parseRequiredDateRange({ startDate, endDate });
    return this.reportsService.getReconciliationReport(dateRange);
  }

  // ==========================================
  // Export Reports
  // ==========================================

  @Get('export/transactions')
  @Roles('admin')
  @ApiOperation({ summary: 'Export transactions as JSON or CSV' })
  @ApiResponse({ status: 200, description: 'Transactions exported' })
  async exportTransactions(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const dateRange = this.parseRequiredDateRange({
      startDate: query.startDate,
      endDate: query.endDate,
    });
    const format = query.format || 'json';
    const { data, filename } = await this.reportsService.exportTransactions(
      dateRange,
      format,
    );

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  // ==========================================
  // Dashboard Quick Stats
  // ==========================================

  @Get('dashboard/quick-stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get quick stats for dashboard' })
  @ApiResponse({ status: 200, description: 'Quick stats retrieved' })
  async getQuickStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const [todayStats, weekStats, monthStats] = await Promise.all([
      this.reportsService.getTransactionSummary({
        startDate: today,
        endDate: endOfToday,
      }),
      this.reportsService.getTransactionSummary({
        startDate: lastWeek,
        endDate: endOfToday,
      }),
      this.reportsService.getTransactionSummary({
        startDate: lastMonth,
        endDate: endOfToday,
      }),
    ]);

    return {
      today: {
        transactions: todayStats.totalCount,
        volume: todayStats.totalVolume,
      },
      week: {
        transactions: weekStats.totalCount,
        volume: weekStats.totalVolume,
      },
      month: {
        transactions: monthStats.totalCount,
        volume: monthStats.totalVolume,
      },
    };
  }
}
