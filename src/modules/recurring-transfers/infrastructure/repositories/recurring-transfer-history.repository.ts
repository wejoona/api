import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTransferHistoryRepository as IRecurringTransferHistoryRepository } from '../../domain/repositories/recurring-transfer-history.repository';
import { RecurringTransferHistory } from '../../domain/entities/recurring-transfer-history.entity';
import { RecurringTransferHistoryOrmEntity } from '../orm-entities/recurring-transfer-history.orm-entity';
import { RecurringTransferHistoryMapper } from '../mappers/recurring-transfer-history.mapper';

@Injectable()
export class TypeOrmRecurringTransferHistoryRepository extends IRecurringTransferHistoryRepository {
  constructor(
    @InjectRepository(RecurringTransferHistoryOrmEntity)
    private readonly repo: Repository<RecurringTransferHistoryOrmEntity>,
    private readonly mapper: RecurringTransferHistoryMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<RecurringTransferHistory | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByRecurringTransferId(
    recurringTransferId: string,
  ): Promise<RecurringTransferHistory[]> {
    const entities = await this.repo.find({
      where: { recurringTransferId },
      order: { executedAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(
    history: RecurringTransferHistory,
  ): Promise<RecurringTransferHistory> {
    const entity = this.mapper.toOrmEntity(history);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
