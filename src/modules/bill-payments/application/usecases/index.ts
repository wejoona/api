export * from './get-providers.use-case';
export * from './validate-account.use-case';
export * from './pay-bill.use-case';
export * from './get-payment-history.use-case';
export * from './get-receipt.use-case';

import { GetProvidersUseCase } from './get-providers.use-case';
import { ValidateAccountUseCase } from './validate-account.use-case';
import { PayBillUseCase } from './pay-bill.use-case';
import { GetPaymentHistoryUseCase } from './get-payment-history.use-case';
import { GetReceiptUseCase } from './get-receipt.use-case';

export const BillPaymentUseCases = [
  GetProvidersUseCase,
  ValidateAccountUseCase,
  PayBillUseCase,
  GetPaymentHistoryUseCase,
  GetReceiptUseCase,
];
