import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { WalletOrmEntity } from '@modules/wallet/infrastructure/orm-entities';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TransactionSummary {
  totalCount: number;
  totalVolume: number;
  avgTransactionSize: number;
  byStatus: { status: string; count: number; volume: number }[];
  byType: { type: string; count: number; volume: number }[];
  byCurrency: { currency: string; count: number; volume: number }[];
}

export interface DailyTransactionReport {
  date: string;
  totalCount: number;
  totalVolume: number;
  deposits: { count: number; volume: number };
  transfers: { count: number; volume: number };
  withdrawals: { count: number; volume: number };
}

export interface UserActivityReport {
  userId: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  totalTransactions: number;
  totalVolume: number;
  lastActivityAt: Date | null;
}

export interface ReconciliationReport {
  period: DateRange;
  totalDeposits: { count: number; volume: number };
  totalWithdrawals: { count: number; volume: number };
  totalTransfers: { count: number; volume: number };
  pendingTransactions: { count: number; volume: number };
  failedTransactions: { count: number; volume: number };
  netFlow: number;
}

@Injectable()
export class ReportsService {
  private readonly _logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletRepository: Repository<WalletOrmEntity>,
  ) {}

  // ==========================================
  // Transaction Reports
  // ==========================================

  async getTransactionSummary(
    dateRange?: DateRange,
  ): Promise<TransactionSummary> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('tx');

    if (dateRange) {
      queryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    // Get totals
    const totalsResult = await queryBuilder
      .select('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
      .addSelect('COALESCE(AVG(tx.amount), 0)', 'avgSize')
      .getRawOne();

    // Get by status
    const byStatusQueryBuilder =
      this.transactionRepository.createQueryBuilder('tx');
    if (dateRange) {
      byStatusQueryBuilder.where(
        'tx.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      );
    }
    const byStatus = await byStatusQueryBuilder
      .select('tx.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .groupBy('tx.status')
      .getRawMany();

    // Get by type
    const byTypeQueryBuilder =
      this.transactionRepository.createQueryBuilder('tx');
    if (dateRange) {
      byTypeQueryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }
    const byType = await byTypeQueryBuilder
      .select('tx.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .groupBy('tx.type')
      .getRawMany();

    // Get by currency
    const byCurrencyQueryBuilder =
      this.transactionRepository.createQueryBuilder('tx');
    if (dateRange) {
      byCurrencyQueryBuilder.where(
        'tx.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      );
    }
    const byCurrency = await byCurrencyQueryBuilder
      .select('tx.currency', 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .groupBy('tx.currency')
      .getRawMany();

    return {
      totalCount: parseInt(totalsResult.totalCount, 10),
      totalVolume: parseFloat(totalsResult.totalVolume),
      avgTransactionSize: parseFloat(totalsResult.avgSize),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: parseInt(s.count, 10),
        volume: parseFloat(s.volume),
      })),
      byType: byType.map((t) => ({
        type: t.type,
        count: parseInt(t.count, 10),
        volume: parseFloat(t.volume),
      })),
      byCurrency: byCurrency.map((c) => ({
        currency: c.currency,
        count: parseInt(c.count, 10),
        volume: parseFloat(c.volume),
      })),
    };
  }

  async getDailyTransactionReport(
    dateRange: DateRange,
  ): Promise<DailyTransactionReport[]> {
    const result = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('DATE(tx.createdAt) as date')
      .addSelect('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
      .addSelect("COUNT(*) FILTER (WHERE tx.type = 'deposit')", 'depositCount')
      .addSelect(
        "COALESCE(SUM(tx.amount) FILTER (WHERE tx.type = 'deposit'), 0)",
        'depositVolume',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE tx.type IN ('transfer_internal', 'transfer_external'))",
        'transferCount',
      )
      .addSelect(
        "COALESCE(SUM(tx.amount) FILTER (WHERE tx.type IN ('transfer_internal', 'transfer_external')), 0)",
        'transferVolume',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE tx.type = 'withdrawal')",
        'withdrawalCount',
      )
      .addSelect(
        "COALESCE(SUM(tx.amount) FILTER (WHERE tx.type = 'withdrawal'), 0)",
        'withdrawalVolume',
      )
      .where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .groupBy('DATE(tx.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      date: row.date,
      totalCount: parseInt(row.totalCount, 10),
      totalVolume: parseFloat(row.totalVolume),
      deposits: {
        count: parseInt(row.depositCount, 10),
        volume: parseFloat(row.depositVolume),
      },
      transfers: {
        count: parseInt(row.transferCount, 10),
        volume: parseFloat(row.transferVolume),
      },
      withdrawals: {
        count: parseInt(row.withdrawalCount, 10),
        volume: parseFloat(row.withdrawalVolume),
      },
    }));
  }

  // ==========================================
  // User Activity Reports
  // ==========================================

  async getTopUsersByVolume(
    dateRange?: DateRange,
    limit = 20,
  ): Promise<UserActivityReport[]> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoin(WalletOrmEntity, 'wallet', 'wallet.id = tx.walletId')
      .leftJoin(UserOrmEntity, 'user', 'user.id = wallet.userId')
      .select('user.id', 'userId')
      .addSelect('user.phone', 'phone')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COUNT(tx.id)', 'totalTransactions')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
      .addSelect('MAX(tx.createdAt)', 'lastActivityAt')
      .where("tx.status = 'completed'");

    if (dateRange) {
      queryBuilder.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const result = await queryBuilder
      .groupBy('user.id')
      .addGroupBy('user.phone')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('totalVolume', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((row) => ({
      userId: row.userId,
      phone: row.phone,
      firstName: row.firstName,
      lastName: row.lastName,
      totalTransactions: parseInt(row.totalTransactions, 10),
      totalVolume: parseFloat(row.totalVolume),
      lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : null,
    }));
  }

  async getUserActivitySummary(
    userId: string,
    dateRange?: DateRange,
  ): Promise<{
    user: { id: string; phone: string; name: string | null };
    summary: TransactionSummary;
    recentTransactions: TransactionOrmEntity[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const wallets = await this.walletRepository.find({
      where: { userId },
    });
    const walletIds = wallets.map((w) => w.id);

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.walletId IN (:...walletIds)', { walletIds });

    if (dateRange) {
      queryBuilder.andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    // Get totals
    const totals = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.walletId IN (:...walletIds)', { walletIds })
      .select('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
      .addSelect('COALESCE(AVG(tx.amount), 0)', 'avgSize')
      .getRawOne();

    // Get by status and type
    const byStatus = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.walletId IN (:...walletIds)', { walletIds })
      .select('tx.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .groupBy('tx.status')
      .getRawMany();

    const byType = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.walletId IN (:...walletIds)', { walletIds })
      .select('tx.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .groupBy('tx.type')
      .getRawMany();

    // Get recent transactions
    const recentTransactions = await this.transactionRepository.find({
      where: walletIds.map((id) => ({ walletId: id })),
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name:
          user.firstName || user.lastName
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
            : null,
      },
      summary: {
        totalCount: parseInt(totals.totalCount, 10),
        totalVolume: parseFloat(totals.totalVolume),
        avgTransactionSize: parseFloat(totals.avgSize),
        byStatus: byStatus.map((s) => ({
          status: s.status,
          count: parseInt(s.count, 10),
          volume: parseFloat(s.volume),
        })),
        byType: byType.map((t) => ({
          type: t.type,
          count: parseInt(t.count, 10),
          volume: parseFloat(t.volume),
        })),
        byCurrency: [],
      },
      recentTransactions,
    };
  }

  // ==========================================
  // Reconciliation Reports
  // ==========================================

  async getReconciliationReport(
    dateRange: DateRange,
  ): Promise<ReconciliationReport> {
    const deposits = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .andWhere("tx.type = 'deposit'")
      .andWhere("tx.status = 'completed'")
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .getRawOne();

    const withdrawals = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .andWhere("tx.type = 'withdrawal'")
      .andWhere("tx.status = 'completed'")
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .getRawOne();

    const transfers = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .andWhere("tx.type IN ('transfer_internal', 'transfer_external')")
      .andWhere("tx.status = 'completed'")
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .getRawOne();

    const pending = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .andWhere("tx.status IN ('pending', 'processing')")
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .getRawOne();

    const failed = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .andWhere("tx.status = 'failed'")
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'volume')
      .getRawOne();

    const depositVolume = parseFloat(deposits.volume);
    const withdrawalVolume = parseFloat(withdrawals.volume);

    return {
      period: dateRange,
      totalDeposits: {
        count: parseInt(deposits.count, 10),
        volume: depositVolume,
      },
      totalWithdrawals: {
        count: parseInt(withdrawals.count, 10),
        volume: withdrawalVolume,
      },
      totalTransfers: {
        count: parseInt(transfers.count, 10),
        volume: parseFloat(transfers.volume),
      },
      pendingTransactions: {
        count: parseInt(pending.count, 10),
        volume: parseFloat(pending.volume),
      },
      failedTransactions: {
        count: parseInt(failed.count, 10),
        volume: parseFloat(failed.volume),
      },
      netFlow: depositVolume - withdrawalVolume,
    };
  }

  // ==========================================
  // Export Reports
  // ==========================================

  async exportTransactions(
    dateRange: DateRange,
    format: 'json' | 'csv' = 'json',
  ): Promise<{ data: string; filename: string }> {
    const transactions = await this.transactionRepository.find({
      where: {
        createdAt: Between(dateRange.startDate, dateRange.endDate),
      },
      order: { createdAt: 'DESC' },
    });

    const filename = `transactions_${dateRange.startDate.toISOString().split('T')[0]}_${dateRange.endDate.toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const headers = [
        'ID',
        'Type',
        'Amount',
        'Currency',
        'Status',
        'Created At',
        'Completed At',
      ];
      const rows = transactions.map((tx) => [
        tx.id,
        tx.type,
        tx.amount,
        tx.currency,
        tx.status,
        tx.createdAt.toISOString(),
        tx.completedAt?.toISOString() || '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\n',
      );
      return { data: csv, filename: `${filename}.csv` };
    }

    return {
      data: JSON.stringify(transactions, null, 2),
      filename: `${filename}.json`,
    };
  }
}
