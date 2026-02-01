import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { RecurringTransferRepository as IRecurringTransferRepository } from '../../domain/repositories/recurring-transfer.repository';
import {
  RecurringTransfer,
  RecurringTransferStatus,
} from '../../domain/entities/recurring-transfer.entity';
import {
  RecurringTransferOrmEntity,
  RecurringTransferStatus as OrmStatus,
} from '../orm-entities/recurring-transfer.orm-entity';
import { RecurringTransferMapper } from '../mappers/recurring-transfer.mapper';

@Injectable()
export class TypeOrmRecurringTransferRepository extends IRecurringTransferRepository {
  constructor(
    @InjectRepository(RecurringTransferOrmEntity)
    private readonly repo: Repository<RecurringTransferOrmEntity>,
    private readonly mapper: RecurringTransferMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<RecurringTransfer | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByWalletId(walletId: string): Promise<RecurringTransfer[]> {
    const entities = await this.repo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByWalletIdAndStatus(
    walletId: string,
    status: RecurringTransferStatus,
  ): Promise<RecurringTransfer[]> {
    const ormStatus = this.mapStatusToOrm(status);
    const entities = await this.repo.find({
      where: { walletId, status: ormStatus },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActiveByWalletId(walletId: string): Promise<RecurringTransfer[]> {
    const entities = await this.repo.find({
      where: { walletId, status: OrmStatus.ACTIVE },
      order: { nextExecutionDate: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findDueForExecution(beforeDate: Date): Promise<RecurringTransfer[]> {
    const entities = await this.repo.find({
      where: {
        status: OrmStatus.ACTIVE,
        nextExecutionDate: LessThanOrEqual(beforeDate),
      },
      order: { nextExecutionDate: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findUpcoming(
    walletId: string,
    limit: number,
  ): Promise<RecurringTransfer[]> {
    const entities = await this.repo.find({
      where: { walletId, status: OrmStatus.ACTIVE },
      order: { nextExecutionDate: 'ASC' },
      take: limit,
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(transfer: RecurringTransfer): Promise<RecurringTransfer> {
    const entity = this.mapper.toOrmEntity(transfer);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async countByWalletId(walletId: string): Promise<number> {
    return this.repo.count({ where: { walletId } });
  }

  private mapStatusToOrm(status: RecurringTransferStatus): OrmStatus {
    switch (status) {
      case RecurringTransferStatus.ACTIVE:
        return OrmStatus.ACTIVE;
      case RecurringTransferStatus.PAUSED:
        return OrmStatus.PAUSED;
      case RecurringTransferStatus.CANCELLED:
        return OrmStatus.CANCELLED;
      case RecurringTransferStatus.COMPLETED:
        return OrmStatus.COMPLETED;
      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }
}
