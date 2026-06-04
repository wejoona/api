import { TransactionEntity } from './transaction.entity';

describe('TransactionEntity', () => {
  it('defaults wallet money movements to USDC', () => {
    expect(
      TransactionEntity.createDeposit({
        walletId: 'wallet-1',
        amount: 10,
      }).currency,
    ).toBe('USDC');

    expect(
      TransactionEntity.createInternalTransfer({
        walletId: 'wallet-1',
        amount: 10,
        recipientWalletId: 'wallet-2',
        recipientPhone: '+2250700000000',
      }).currency,
    ).toBe('USDC');

    expect(
      TransactionEntity.createExternalTransfer({
        walletId: 'wallet-1',
        amount: 10,
        recipientAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }).currency,
    ).toBe('USDC');
  });

  it('defaults bill payments to XOF', () => {
    expect(
      TransactionEntity.createBillPayment({
        walletId: 'wallet-1',
        amount: 1000,
      }).currency,
    ).toBe('XOF');
  });
});
