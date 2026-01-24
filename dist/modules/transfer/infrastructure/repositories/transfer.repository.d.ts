import { Repository } from 'typeorm';
import { TransferOrmEntity } from '../orm-entities/transfer.orm-entity';
import { TransferMapper } from '../mappers/transfer.mapper';
import { TransferEntity, TransferStatus } from '../../application/domain/entities/transfer.entity';
import { ITransferRepository } from '../../domain/repositories/transfer.repository';
export declare class TransferRepository implements ITransferRepository {
    private readonly repository;
    private readonly mapper;
    constructor(repository: Repository<TransferOrmEntity>, mapper: TransferMapper);
    save(entity: TransferEntity): Promise<TransferEntity>;
    findById(id: string): Promise<TransferEntity | null>;
    findByReference(reference: string): Promise<TransferEntity | null>;
    findByUserId(userId: string, limit?: number, offset?: number): Promise<TransferEntity[]>;
    findBySenderId(senderId: string, limit?: number, offset?: number): Promise<TransferEntity[]>;
    findByRecipientId(recipientId: string, limit?: number, offset?: number): Promise<TransferEntity[]>;
    findByStatus(status: TransferStatus): Promise<TransferEntity[]>;
    findByProviderTransferId(providerTransferId: string): Promise<TransferEntity | null>;
    countByUserId(userId: string): Promise<number>;
    findAll(limit?: number, offset?: number): Promise<TransferEntity[]>;
    delete(id: string): Promise<void>;
}
