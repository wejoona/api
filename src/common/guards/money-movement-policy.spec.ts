import { readFileSync } from 'fs';
import { join } from 'path';

interface PolicyCase {
  file: string;
  method: string;
  pinRequired: boolean;
  idempotencyRequired: boolean;
}

const root = join(__dirname, '../..');

const policyCases: PolicyCase[] = [
  {
    file: 'modules/wallet/application/controllers/wallet.controller.ts',
    method: 'initiateDeposit',
    pinRequired: false,
    idempotencyRequired: true,
  },
  {
    file: 'modules/wallet/application/controllers/wallet.controller.ts',
    method: 'internalTransfer',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/wallet/application/controllers/wallet.controller.ts',
    method: 'externalTransfer',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/wallet/application/controllers/wallet.controller.ts',
    method: 'withdraw',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/payment-links/application/controllers/payment-link.controller.ts',
    method: 'payPaymentLink',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/savings-pots/application/controllers/savings-pot.controller.ts',
    method: 'deposit',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/savings-pots/application/controllers/savings-pot.controller.ts',
    method: 'withdraw',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/savings-pots/application/controllers/savings-pot.controller.ts',
    method: 'withdrawAll',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/bank-linking/application/controllers/bank-linking.controller.ts',
    method: 'deposit',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/bank-linking/application/controllers/bank-linking.controller.ts',
    method: 'withdraw',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/bill-payments/application/controllers/bill-payment.controller.ts',
    method: 'payBill',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/merchant/application/controllers/merchant.controller.ts',
    method: 'processPayment',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/merchant/application/controllers/merchant-compat.controller.ts',
    method: 'processPaymentAlias',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/bulk-payments/application/controllers/bulk-payment.controller.ts',
    method: 'createBatch',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/recurring-transfers/application/controllers/recurring-transfer.controller.ts',
    method: 'create',
    pinRequired: true,
    idempotencyRequired: true,
  },
  {
    file: 'modules/recurring-transfers/application/controllers/recurring-transfer.controller.ts',
    method: 'update',
    pinRequired: true,
    idempotencyRequired: true,
  },
];

function getDecoratorBlock(item: PolicyCase): string {
  const source = readFileSync(join(root, item.file), 'utf8');
  const methodPattern = new RegExp(`async\\s+${item.method}\\s*\\(`);
  const methodMatch = methodPattern.exec(source);
  expect(methodMatch).toBeTruthy();

  const beforeMethod = source.slice(0, methodMatch!.index);
  const previousMethod = beforeMethod.lastIndexOf('\n  async ');
  const start = previousMethod === -1 ? 0 : previousMethod;
  return beforeMethod.slice(start);
}

describe('mobile money movement protection policy', () => {
  it.each(policyCases)('$file#$method has required protection', (item) => {
    const decorators = getDecoratorBlock(item);

    if (item.pinRequired) {
      expect(decorators).toContain('PinVerificationGuard');
    }

    if (item.idempotencyRequired) {
      expect(
        decorators.includes('IdempotencyInterceptor') ||
          decorators.includes('IdempotencyGuard'),
      ).toBe(true);
    }
  });
});
