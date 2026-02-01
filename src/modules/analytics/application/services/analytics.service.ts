import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';
import {
  SpendingByCategory,
  IncomeVsExpenses,
  MonthlyTrends,
  TopRecipients,
} from '../../domain/entities/spending-analytics.entity';
import { TimePeriod } from '../dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getSpendingByCategory(
    walletId: string,
    startDate?: Date,
    endDate?: Date,
    period?: TimePeriod,
  ): Promise<SpendingByCategory> {
    const { start, end } = this.calculateDateRange(startDate, endDate, period);
    return this.analyticsRepository.getSpendingByCategory({
      walletId,
      startDate: start,
      endDate: end,
    });
  }

  async getIncomeVsExpenses(
    walletId: string,
    startDate?: Date,
    endDate?: Date,
    period?: TimePeriod,
  ): Promise<IncomeVsExpenses> {
    const { start, end } = this.calculateDateRange(startDate, endDate, period);
    return this.analyticsRepository.getIncomeVsExpenses({
      walletId,
      startDate: start,
      endDate: end,
    });
  }

  async getMonthlyTrends(
    walletId: string,
    startDate?: Date,
    endDate?: Date,
    period?: TimePeriod,
  ): Promise<MonthlyTrends> {
    const { start, end } = this.calculateDateRange(startDate, endDate, period);
    return this.analyticsRepository.getMonthlyTrends({
      walletId,
      startDate: start,
      endDate: end,
    });
  }

  async getTopRecipients(
    walletId: string,
    startDate?: Date,
    endDate?: Date,
    period?: TimePeriod,
  ): Promise<TopRecipients> {
    const { start, end } = this.calculateDateRange(startDate, endDate, period);
    return this.analyticsRepository.getTopRecipients({
      walletId,
      startDate: start,
      endDate: end,
    });
  }

  private calculateDateRange(
    startDate?: Date,
    endDate?: Date,
    period?: TimePeriod,
  ): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    const end: Date = endDate || now;

    if (startDate) {
      start = startDate;
    } else if (period) {
      start = this.getStartDateForPeriod(period, now);
    } else {
      // Default to last 3 months
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
    }

    return { start, end };
  }

  private getStartDateForPeriod(period: TimePeriod, referenceDate: Date): Date {
    const date = new Date(referenceDate);

    switch (period) {
      case TimePeriod.WEEK:
        date.setDate(date.getDate() - 7);
        break;
      case TimePeriod.MONTH:
        date.setMonth(date.getMonth() - 1);
        break;
      case TimePeriod.QUARTER:
        date.setMonth(date.getMonth() - 3);
        break;
      case TimePeriod.YEAR:
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 3);
    }

    return date;
  }
}
