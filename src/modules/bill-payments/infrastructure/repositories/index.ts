export * from './bill-provider.repository';
export * from './bill-payment.repository';

import { BillProviderRepository } from './bill-provider.repository';
import { BillPaymentRepository } from './bill-payment.repository';

export const BillPaymentRepositories = [
  BillProviderRepository,
  BillPaymentRepository,
];
