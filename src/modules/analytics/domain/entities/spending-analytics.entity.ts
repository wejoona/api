export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface IncomeVsExpenses {
  income: number;
  expenses: number;
  netFlow: number;
  incomeTransactions: number;
  expenseTransactions: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  netFlow: number;
  transactionCount: number;
}

export interface TopRecipient {
  recipientName?: string;
  recipientPhone?: string;
  recipientWalletId?: string;
  amount: number;
  count: number;
  lastTransactionDate: Date;
}

export interface SpendingByCategory {
  categories: CategoryBreakdown[];
  totalSpent: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface MonthlyTrends {
  trends: MonthlyTrend[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface TopRecipients {
  recipients: TopRecipient[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}
