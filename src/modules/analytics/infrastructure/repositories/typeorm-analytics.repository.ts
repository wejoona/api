import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsRepository,
  AnalyticsFilter,
} from '../../domain/repositories/analytics.repository';
import {
  SpendingByCategory,
  IncomeVsExpenses,
  MonthlyTrends,
  TopRecipients,
  CategoryBreakdown,
  MonthlyTrend,
  TopRecipient,
} from '../../domain/entities/spending-analytics.entity';
import { TransactionOrmEntity } from '../../../transaction/infrastructure/orm-entities/transaction.orm-entity';

@Injectable()
export class TypeOrmAnalyticsRepository extends AnalyticsRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepo: Repository<TransactionOrmEntity>,
  ) {
    super();
  }

  async getSpendingByCategory(
    filter: AnalyticsFilter,
  ): Promise<SpendingByCategory> {
    // Get all expense transactions (withdrawals, transfers, bill payments)
    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.walletId = :walletId', { walletId: filter.walletId })
      .andWhere('t.status = :status', { status: 'completed' })
      .andWhere('t.createdAt >= :startDate', { startDate: filter.startDate })
      .andWhere('t.createdAt <= :endDate', { endDate: filter.endDate })
      .andWhere('t.type IN (:...types)', {
        types: [
          'withdrawal',
          'transfer_internal',
          'transfer_external',
          'bill_payment',
        ],
      })
      .getMany();

    // Group by category from metadata
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalSpent = 0;

    for (const txn of transactions) {
      const category = this.extractCategory(txn);
      const amount = Number(txn.amount);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { amount: 0, count: 0 });
      }

      const current = categoryMap.get(category)!;
      current.amount += amount;
      current.count += 1;
      totalSpent += amount;
    }

    // Convert to array with percentages
    const categories: CategoryBreakdown[] = [];
    categoryMap.forEach((value, category) => {
      categories.push({
        category,
        amount: value.amount,
        count: value.count,
        percentage: totalSpent > 0 ? (value.amount / totalSpent) * 100 : 0,
      });
    });

    // Sort by amount descending
    categories.sort((a, b) => b.amount - a.amount);

    return {
      categories,
      totalSpent,
      period: {
        startDate: filter.startDate,
        endDate: filter.endDate,
      },
    };
  }

  async getIncomeVsExpenses(
    filter: AnalyticsFilter,
  ): Promise<IncomeVsExpenses> {
    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.walletId = :walletId', { walletId: filter.walletId })
      .andWhere('t.status = :status', { status: 'completed' })
      .andWhere('t.createdAt >= :startDate', { startDate: filter.startDate })
      .andWhere('t.createdAt <= :endDate', { endDate: filter.endDate })
      .getMany();

    let income = 0;
    let expenses = 0;
    let incomeTransactions = 0;
    let expenseTransactions = 0;

    for (const txn of transactions) {
      const amount = Number(txn.amount);
      if (txn.type === 'deposit') {
        income += amount;
        incomeTransactions += 1;
      } else {
        expenses += amount;
        expenseTransactions += 1;
      }
    }

    return {
      income,
      expenses,
      netFlow: income - expenses,
      incomeTransactions,
      expenseTransactions,
    };
  }

  async getMonthlyTrends(filter: AnalyticsFilter): Promise<MonthlyTrends> {
    // PostgreSQL-specific query to group by month
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select("TO_CHAR(t.createdAt, 'YYYY-MM')", 'month')
      .addSelect(
        `SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END)`,
        'income',
      )
      .addSelect(
        `SUM(CASE WHEN t.type != 'deposit' THEN t.amount ELSE 0 END)`,
        'expenses',
      )
      .addSelect('COUNT(*)', 'transactionCount')
      .where('t.walletId = :walletId', { walletId: filter.walletId })
      .andWhere('t.status = :status', { status: 'completed' })
      .andWhere('t.createdAt >= :startDate', { startDate: filter.startDate })
      .andWhere('t.createdAt <= :endDate', { endDate: filter.endDate })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    const trends: MonthlyTrend[] = result.map((row) => ({
      month: row.month,
      income: Number(row.income) || 0,
      expenses: Number(row.expenses) || 0,
      netFlow: Number(row.income || 0) - Number(row.expenses || 0),
      transactionCount: parseInt(row.transactionCount, 10),
    }));

    return {
      trends,
      period: {
        startDate: filter.startDate,
        endDate: filter.endDate,
      },
    };
  }

  async getTopRecipients(filter: AnalyticsFilter): Promise<TopRecipients> {
    // Get all outgoing transfers
    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.walletId = :walletId', { walletId: filter.walletId })
      .andWhere('t.status = :status', { status: 'completed' })
      .andWhere('t.createdAt >= :startDate', { startDate: filter.startDate })
      .andWhere('t.createdAt <= :endDate', { endDate: filter.endDate })
      .andWhere('t.type IN (:...types)', {
        types: ['transfer_internal', 'transfer_external'],
      })
      .orderBy('t.createdAt', 'DESC')
      .getMany();

    // Group by recipient
    const recipientMap = new Map<
      string,
      {
        recipientName?: string;
        recipientPhone?: string;
        recipientWalletId?: string;
        amount: number;
        count: number;
        lastTransactionDate: Date;
      }
    >();

    for (const txn of transactions) {
      const key =
        txn.recipientWalletId ||
        txn.recipientPhone ||
        txn.recipientAddress ||
        'unknown';
      const amount = Number(txn.amount);

      if (!recipientMap.has(key)) {
        recipientMap.set(key, {
          recipientName: this.extractRecipientName(txn),
          recipientPhone: txn.recipientPhone || undefined,
          recipientWalletId: txn.recipientWalletId || undefined,
          amount: 0,
          count: 0,
          lastTransactionDate: txn.createdAt,
        });
      }

      const current = recipientMap.get(key)!;
      current.amount += amount;
      current.count += 1;
      // Keep the most recent transaction date
      if (txn.createdAt > current.lastTransactionDate) {
        current.lastTransactionDate = txn.createdAt;
      }
    }

    // Convert to array and sort by amount
    const recipients: TopRecipient[] = Array.from(recipientMap.values()).sort(
      (a, b) => b.amount - a.amount,
    );

    // Limit to top 10
    const topRecipients = recipients.slice(0, 10);

    return {
      recipients: topRecipients,
      period: {
        startDate: filter.startDate,
        endDate: filter.endDate,
      },
    };
  }

  private extractCategory(txn: TransactionOrmEntity): string {
    // Try to get category from metadata
    if (txn.metadata && typeof txn.metadata === 'object') {
      const metadata = txn.metadata;
      if (metadata.category && typeof metadata.category === 'string') {
        return metadata.category;
      }
    }

    // Fallback based on transaction type
    switch (txn.type) {
      case 'withdrawal':
        return 'Cash Out';
      case 'transfer_internal':
        return 'Transfers';
      case 'transfer_external':
        return 'External Transfers';
      case 'bill_payment':
        return 'Bills';
      default:
        return 'Other';
    }
  }

  private extractRecipientName(txn: TransactionOrmEntity): string | undefined {
    if (txn.metadata && typeof txn.metadata === 'object') {
      const metadata = txn.metadata;
      if (
        metadata.recipientName &&
        typeof metadata.recipientName === 'string'
      ) {
        return metadata.recipientName;
      }
    }
    return undefined;
  }
}
