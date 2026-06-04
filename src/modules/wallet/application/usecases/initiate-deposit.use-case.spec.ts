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
        getOnRampChannels: jest.fn().mockResolvedValue([
          {
            id: 'orange_money_ci',
            name: 'Orange Money',
            type: 'mobile_money',
            provider: 'orange',
            country: 'CI',
            minAmount: 1000,
            maxAmount: 500000,
            fee: 1.5,
            feeType: 'percentage',
            currency: 'XOF',
          },
        ]),
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
      channelCountry: 'CI',
      channelId: 'orange_money_ci',
      providerReference: 'yc_dep_123',
      paymentReference: 'DEP-123',
    });
  });

  it('rejects unsupported USD channels before provider initiation', async () => {
    const wallet = WalletEntity.create({
      userId: 'user-1',
      yellowCardWalletId: 'yc-wallet-1',
    });
    const initiateDeposit = jest.fn();

    const useCase = new InitiateDepositUseCase(
      {
        findByUserId: jest.fn().mockResolvedValue(wallet),
      } as any,
      {
        save: jest.fn(),
      } as any,
      {
        getOnRampChannels: jest.fn().mockResolvedValue([]),
        initiateDeposit,
      } as any,
      {
        evaluate: jest.fn(),
      } as any,
      {
        emit: jest.fn(),
      } as unknown as EventEmitter2,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        amount: 25,
        sourceCurrency: 'USD',
        channelId: 'bank_us_ach',
      }),
    ).rejects.toMatchObject({
      code: 'E4001',
      context: expect.objectContaining({
        reason: 'deposit_channel_unavailable',
        country: 'US',
        currency: 'USD',
        channelId: 'bank_us_ach',
      }),
    });
    expect(initiateDeposit).not.toHaveBeenCalled();
  });
});
