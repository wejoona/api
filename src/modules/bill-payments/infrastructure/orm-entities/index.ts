export * from './bill-provider.orm-entity';
export * from './bill-payment.orm-entity';

export const BillPaymentOrmEntities = [
  require('./bill-provider.orm-entity').BillProviderOrmEntity,
  require('./bill-payment.orm-entity').BillPaymentOrmEntity,
];
