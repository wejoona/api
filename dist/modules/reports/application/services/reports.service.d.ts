import { Repository } from 'typeorm';
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
    byStatus: {
        status: string;
        count: number;
        volume: number;
    }[];
    byType: {
        type: string;
        count: number;
        volume: number;
    }[];
    byCurrency: {
        currency: string;
        count: number;
        volume: number;
    }[];
}
export interface DailyTransactionReport {
    date: string;
    totalCount: number;
    totalVolume: number;
    deposits: {
        count: number;
        volume: number;
    };
    transfers: {
        count: number;
        volume: number;
    };
    withdrawals: {
        count: number;
        volume: number;
    };
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
    totalDeposits: {
        count: number;
        volume: number;
    };
    totalWithdrawals: {
        count: number;
        volume: number;
    };
    totalTransfers: {
        count: number;
        volume: number;
    };
    pendingTransactions: {
        count: number;
        volume: number;
    };
    failedTransactions: {
        count: number;
        volume: number;
    };
    netFlow: number;
}
export declare class ReportsService {
    private readonly transactionRepository;
    private readonly userRepository;
    private readonly walletRepository;
    private readonly logger;
    constructor(transactionRepository: Repository<TransactionOrmEntity>, userRepository: Repository<UserOrmEntity>, walletRepository: Repository<WalletOrmEntity>);
    getTransactionSummary(dateRange?: DateRange): Promise<TransactionSummary>;
    getDailyTransactionReport(dateRange: DateRange): Promise<DailyTransactionReport[]>;
    getTopUsersByVolume(dateRange?: DateRange, limit?: number): Promise<UserActivityReport[]>;
    getUserActivitySummary(userId: string, dateRange?: DateRange): Promise<{
        user: {
            id: string;
            phone: string;
            name: string | null;
        };
        summary: TransactionSummary;
        recentTransactions: TransactionOrmEntity[];
    }>;
    getReconciliationReport(dateRange: DateRange): Promise<ReconciliationReport>;
    exportTransactions(dateRange: DateRange, format?: 'json' | 'csv'): Promise<{
        data: string;
        filename: string;
    }>;
}
