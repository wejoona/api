import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { InitiateDepositUseCase } from './initiate-deposit.use-case';

describe('InitiateDepositUseCase', () => {
  it('stores a positive net target amount when provider fee is in source currency', async () => {
    const wallet = WalletEntity.create({
      userId: 'user-1',
      yellowCardWalletId: 'yc-wallet-1',
    });

    const savedTransactions: {
      amount: number;
      metadata: Record<string, unknown> | null;
    }[] = [];

    const useCase = new InitiateDepositUseCase(
      {
        findByUserId: jest.fn().mockResolvedValue(wallet),
      } as any,
      {
        save: jest.fn(async (transaction) => {
          savedTransactions.push({
            amount: transaction.amount,
            metadata: transaction.metadata,
          });
          return transaction;
        }),
      } as any,
      {
        initiateDeposit: jest.fn().mockResolvedValue({
          id: 'dep_123',
          externalId: 'yc_dep_123',
          subwalletId: 'yc-wallet-1',
          amount: 5000,
          sourceCurrency: 'XOF',
          targetCurrency: 'USD',
          rate: 0.00166,
          fee: 75,
          status: 'pending',
          paymentInstructions: {
            type: 'mobile_money',
            provider: 'orange',
            reference: 'DEP-123',
            instructions: 'Send funds',
          },
          createdAt: new Date(),
          expiresAt: new Date('2026-06-04T06:00:00.000Z'),
        }),
      } as any,
      {
        evaluate: jest.fn().mockResolvedValue({ decision: 'APPROVE' }),
      } as any,
      {
        emit: jest.fn(),
      } as unknown as EventEmitter2,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      amount: 5000,
      sourceCurrency: 'XOF',
      channelId: 'orange_money_ci',
    });

    expect(result.estimatedAmount).toBe(8.18);
    expect(result.estimatedAmount).toBeGreaterThan(0);
    expect(result).toMatchObject({
      supportReference: expect.any(String),
      providerReference: 'yc_dep_123',
      paymentReference: 'DEP-123',
    });
    expect(savedTransactions[0].amount).toBe(8.18);
    expect(savedTransactions[0].metadata).toMatchObject({
      fee: 75,
      feeCurrency: 'XOF',
      sourceAmount: 5000,
      sourceCurrency: 'XOF',
      providerReference: 'yc_dep_123',
      paymentReference: 'DEP-123',
    });
  });
});
