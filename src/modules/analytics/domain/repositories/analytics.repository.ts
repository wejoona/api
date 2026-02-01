import {
  SpendingByCategory,
  IncomeVsExpenses,
  MonthlyTrends,
  TopRecipients,
} from '../entities/spending-analytics.entity';

export interface AnalyticsFilter {
  walletId: string;
  startDate: Date;
  endDate: Date;
}

export abstract class AnalyticsRepository {
  abstract getSpendingByCategory(
    filter: AnalyticsFilter,
  ): Promise<SpendingByCategory>;

  abstract getIncomeVsExpenses(
    filter: AnalyticsFilter,
  ): Promise<IncomeVsExpenses>;

  abstract getMonthlyTrends(filter: AnalyticsFilter): Promise<MonthlyTrends>;

  abstract getTopRecipients(filter: AnalyticsFilter): Promise<TopRecipients>;
}
