import { Injectable } from '@nestjs/common';
import {
  RecurringTransfer,
  RecurringTransferFrequency,
  RecurringTransferStatus,
} from '../../domain/entities/recurring-transfer.entity';
import {
  RecurringTransferOrmEntity,
  RecurringTransferFrequency as OrmFrequency,
  RecurringTransferStatus as OrmStatus,
} from '../orm-entities/recurring-transfer.orm-entity';

@Injectable()
export class RecurringTransferMapper {
  toDomain(entity: RecurringTransferOrmEntity): RecurringTransfer {
    return RecurringTransfer.reconstitute({
      id: entity.id,
      walletId: entity.walletId,
      recipientPhone: entity.recipientPhone,
      recipientName: entity.recipientName,
      amount: parseFloat(entity.amount),
      currency: entity.currency,
      frequency: this.mapFrequencyToDomain(entity.frequency),
      startDate: entity.startDate,
      endDate: entity.endDate,
      nextExecutionDate: entity.nextExecutionDate,
      occurrencesTotal: entity.occurrencesTotal,
      occurrencesRemaining: entity.occurrencesRemaining,
      status: this.mapStatusToDomain(entity.status),
      note: entity.note,
      dayOfWeek: entity.dayOfWeek,
      dayOfMonth: entity.dayOfMonth,
      executedCount: entity.executedCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(transfer: RecurringTransfer): RecurringTransferOrmEntity {
    const entity = new RecurringTransferOrmEntity();
    entity.id = transfer.id;
    entity.walletId = transfer.walletId;
    entity.recipientPhone = transfer.recipientPhone;
    entity.recipientName = transfer.recipientName;
    entity.amount = transfer.amount.toString();
    entity.currency = transfer.currency;
    entity.frequency = this.mapFrequencyToOrm(transfer.frequency);
    entity.startDate = transfer.startDate;
    entity.endDate = transfer.endDate;
    entity.nextExecutionDate = transfer.nextExecutionDate;
    entity.occurrencesTotal = transfer.occurrencesTotal;
    entity.occurrencesRemaining = transfer.occurrencesRemaining;
    entity.status = this.mapStatusToOrm(transfer.status);
    entity.note = transfer.note;
    entity.dayOfWeek = transfer.dayOfWeek;
    entity.dayOfMonth = transfer.dayOfMonth;
    entity.executedCount = transfer.executedCount;
    return entity;
  }

  private mapFrequencyToDomain(
    frequency: OrmFrequency,
  ): RecurringTransferFrequency {
    switch (frequency) {
      case OrmFrequency.DAILY:
        return RecurringTransferFrequency.DAILY;
      case OrmFrequency.WEEKLY:
        return RecurringTransferFrequency.WEEKLY;
      case OrmFrequency.BIWEEKLY:
        return RecurringTransferFrequency.BIWEEKLY;
      case OrmFrequency.MONTHLY:
        return RecurringTransferFrequency.MONTHLY;
      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }
  }

  private mapFrequencyToOrm(
    frequency: RecurringTransferFrequency,
  ): OrmFrequency {
    switch (frequency) {
      case RecurringTransferFrequency.DAILY:
        return OrmFrequency.DAILY;
      case RecurringTransferFrequency.WEEKLY:
        return OrmFrequency.WEEKLY;
      case RecurringTransferFrequency.BIWEEKLY:
        return OrmFrequency.BIWEEKLY;
      case RecurringTransferFrequency.MONTHLY:
        return OrmFrequency.MONTHLY;
      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }
  }

  private mapStatusToDomain(status: OrmStatus): RecurringTransferStatus {
    switch (status) {
      case OrmStatus.ACTIVE:
        return RecurringTransferStatus.ACTIVE;
      case OrmStatus.PAUSED:
        return RecurringTransferStatus.PAUSED;
      case OrmStatus.CANCELLED:
        return RecurringTransferStatus.CANCELLED;
      case OrmStatus.COMPLETED:
        return RecurringTransferStatus.COMPLETED;
      default:
        throw new Error(`Unknown status: ${status}`);
    }
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
