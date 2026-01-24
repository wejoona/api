import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { TransactionMapper } from '../mappers/transaction.mapper';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repository: Repository<TransactionOrmEntity>,
    private readonly mapper: TransactionMapper,
  ) {}

  async save(entity: TransactionEntity): Promise<TransactionEntity> {
    const ormEntity = this.mapper.toOrmEntity(entity);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return this.mapper.toDomainEntity(savedOrmEntity);
  }

  async findById(id: string): Promise<TransactionEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { id },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByWalletId(walletId: string): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async findByYellowCardRef(
    yellowCardRef: string,
  ): Promise<TransactionEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { yellowCardRef },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  // Generic alias for provider reference lookup (decoupled from Yellow Card naming)
  async findByProviderRef(
    providerRef: string,
  ): Promise<TransactionEntity | null> {
    return this.findByYellowCardRef(providerRef);
  }

  async findPendingByWalletId(walletId: string): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      where: { walletId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async findAll(): Promise<TransactionEntity[]> {
    const ormEntities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    if (!ormEntities) {
      return [];
    }
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Update transaction by ID with partial data
   * Used for updating status, external references, and metadata
   */
  async update(
    id: string,
    data: Partial<{
      status: string;
      yellowCardRef: string | null;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<void> {
    await this.repository.update(id, data);
  }

  /**
   * Update transaction status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    await this.repository.update(id, { status });
  }

  /**
   * SECURITY: Get total transfer volume for a user since a given date
   * Used for KYC-based daily transfer limit enforcement
   * Note: This provides application-level limits on top of Blnk ledger
   */
  async getDailyTransferVolume(userId: string, sinceDate: Date): Promise<number> {
    // First get the user's wallet ID
    const result = await this.repository
      .createQueryBuilder('transaction')
      .innerJoin('wallets', 'wallet', 'wallet.id = transaction.walletId')
      .select('COALESCE(SUM(ABS(transaction.amount)), 0)', 'totalVolume')
      .where('wallet.userId = :userId', { userId })
      .andWhere('transaction.createdAt >= :sinceDate', { sinceDate })
      .andWhere('transaction.type IN (:...types)', {
        types: ['internal_transfer', 'external_transfer', 'withdrawal']
      })
      .andWhere('transaction.status IN (:...statuses)', {
        statuses: ['completed', 'pending', 'processing']
      })
      .getRawOne();

    return parseFloat(result?.totalVolume || '0');
  }
}
