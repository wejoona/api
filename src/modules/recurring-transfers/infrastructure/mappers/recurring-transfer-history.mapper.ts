import { Injectable } from '@nestjs/common';
import { RecurringTransferHistory } from '../../domain/entities/recurring-transfer-history.entity';
import { RecurringTransferHistoryOrmEntity } from '../orm-entities/recurring-transfer-history.orm-entity';

@Injectable()
export class RecurringTransferHistoryMapper {
  toDomain(
    entity: RecurringTransferHistoryOrmEntity,
  ): RecurringTransferHistory {
    return RecurringTransferHistory.reconstitute({
      id: entity.id,
      recurringTransferId: entity.recurringTransferId,
      amount: parseFloat(entity.amount),
      currency: entity.currency,
      executedAt: entity.executedAt,
      success: entity.success,
      errorMessage: entity.errorMessage,
      transactionId: entity.transactionId,
    });
  }

  toOrmEntity(
    history: RecurringTransferHistory,
  ): RecurringTransferHistoryOrmEntity {
    const entity = new RecurringTransferHistoryOrmEntity();
    entity.id = history.id;
    entity.recurringTransferId = history.recurringTransferId;
    entity.amount = history.amount.toString();
    entity.currency = history.currency;
    entity.executedAt = history.executedAt;
    entity.success = history.success;
    entity.errorMessage = history.errorMessage;
    entity.transactionId = history.transactionId;
    return entity;
  }
}
