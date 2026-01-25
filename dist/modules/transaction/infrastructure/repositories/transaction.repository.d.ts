import { Repository } from 'typeorm';
import { TransactionMapper } from '../mappers/transaction.mapper';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { TransactionFilters } from '../../application/dto/requests';
export declare class TransactionRepository {
    private readonly repository;
    private readonly mapper;
    constructor(repository: Repository<TransactionOrmEntity>, mapper: TransactionMapper);
    save(entity: TransactionEntity): Promise<TransactionEntity>;
    findById(id: string): Promise<TransactionEntity | null>;
    findByWalletId(walletId: string): Promise<TransactionEntity[]>;
    findByYellowCardRef(yellowCardRef: string): Promise<TransactionEntity | null>;
    findByProviderRef(providerRef: string): Promise<TransactionEntity | null>;
    findPendingByWalletId(walletId: string): Promise<TransactionEntity[]>;
    findAll(): Promise<TransactionEntity[]>;
    delete(id: string): Promise<void>;
    update(id: string, data: Partial<{
        status: string;
        yellowCardRef: string | null;
        metadata: Record<string, unknown>;
    }>): Promise<void>;
    updateStatus(id: string, status: string): Promise<void>;
    getDailyTransferVolume(userId: string, sinceDate: Date): Promise<number>;
    findByWalletIdPaginated(walletId: string, options: {
        type?: string;
        status?: string;
        limit: number;
        offset: number;
    }): Promise<{
        transactions: TransactionEntity[];
        total: number;
    }>;
    findByWalletIdFiltered(walletId: string, filters: TransactionFilters): Promise<{
        transactions: TransactionEntity[];
        total: number;
    }>;
    findByWalletIdWithDateRange(walletId: string, startDate?: Date, endDate?: Date): Promise<TransactionEntity[]>;
    getTransactionStats(): Promise<{
        total: number;
        pending: number;
        completed: number;
        failed: number;
        totalVolume: number;
        todayVolume: number;
    }>;
    getVolumeByDateRange(startDate: Date, endDate: Date): Promise<number>;
    getTransactionCountByStatus(): Promise<Record<string, number>>;
    getTransactionTimeSeries(days: number): Promise<{
        date: string;
        count: number;
        volume: number;
    }[]>;
    getTransactionCountByType(): Promise<Record<string, number>>;
}
