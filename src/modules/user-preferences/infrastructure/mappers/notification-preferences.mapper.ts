import { NotificationPreferences } from '../../application/domain/entities';
import { NotificationPreferencesOrmEntity } from '../orm-entities';

export class NotificationPreferencesMapper {
  static toDomain(orm: NotificationPreferencesOrmEntity): NotificationPreferences {
    return NotificationPreferences.reconstitute({
      id: orm.id,
      userId: orm.userId,
      pushEnabled: orm.pushEnabled,
      pushTransactions: orm.pushTransactions,
      pushSecurity: orm.pushSecurity,
      pushMarketing: orm.pushMarketing,
      emailEnabled: orm.emailEnabled,
      emailTransactions: orm.emailTransactions,
      emailMonthlyStatement: orm.emailMonthlyStatement,
      emailMarketing: orm.emailMarketing,
      smsEnabled: orm.smsEnabled,
      smsTransactions: orm.smsTransactions,
      smsSecurity: orm.smsSecurity,
      largeTransactionThreshold: Number(orm.largeTransactionThreshold),
      lowBalanceThreshold: Number(orm.lowBalanceThreshold),
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: NotificationPreferences): NotificationPreferencesOrmEntity {
    const orm = new NotificationPreferencesOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.pushEnabled = domain.pushEnabled;
    orm.pushTransactions = domain.pushTransactions;
    orm.pushSecurity = domain.pushSecurity;
    orm.pushMarketing = domain.pushMarketing;
    orm.emailEnabled = domain.emailEnabled;
    orm.emailTransactions = domain.emailTransactions;
    orm.emailMonthlyStatement = domain.emailMonthlyStatement;
    orm.emailMarketing = domain.emailMarketing;
    orm.smsEnabled = domain.smsEnabled;
    orm.smsTransactions = domain.smsTransactions;
    orm.smsSecurity = domain.smsSecurity;
    orm.largeTransactionThreshold = domain.largeTransactionThreshold;
    orm.lowBalanceThreshold = domain.lowBalanceThreshold;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
