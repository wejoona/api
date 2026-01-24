import { Repository } from 'typeorm';
import { TransactionMapper } from '../mappers/transaction.mapper';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
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
}
