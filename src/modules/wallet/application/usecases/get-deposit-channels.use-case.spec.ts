import { NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  IPaymentGateway,
  OnRampChannel,
} from '../../../shared/domain/gateways';
import { GetDepositChannelsUseCase } from './get-deposit-channels.use-case';

describe('GetDepositChannelsUseCase', () => {
  let useCase: GetDepositChannelsUseCase;
  let walletRepository: jest.Mocked<Pick<WalletRepository, 'findByUserId'>>;
  let paymentGateway: jest.Mocked<Pick<IPaymentGateway, 'getOnRampChannels'>>;

  beforeEach(() => {
    walletRepository = {
      findByUserId: jest.fn(),
    };
    paymentGateway = {
      getOnRampChannels: jest.fn(),
    };
    useCase = new GetDepositChannelsUseCase(
      walletRepository as unknown as WalletRepository,
      paymentGateway as unknown as IPaymentGateway,
    );
  });

  it('resolves channels for the requested country and currency', async () => {
    const channel: OnRampChannel = {
      id: 'ach_us',
      name: 'US Bank Transfer',
      type: 'bank_transfer',
      provider: 'bank',
      country: 'US',
      minAmount: 10,
      maxAmount: 10000,
      fee: 0.5,
      feeType: 'fixed',
      currency: 'USD',
    };

    walletRepository.findByUserId.mockResolvedValue({ id: 'wallet-1' } as any);
    paymentGateway.getOnRampChannels.mockResolvedValue([channel]);

    const result = await useCase.execute({
      userId: 'user-1',
      country: 'us',
      currency: 'usd',
    });

    expect(paymentGateway.getOnRampChannels).toHaveBeenCalledWith('US', 'USD');
    expect(result).toEqual({
      country: 'US',
      currency: 'USD',
      status: 'available',
      reason: null,
      retryable: false,
      supportReviewRequired: false,
      channels: [channel],
    });
  });

  it('returns explicit unavailable metadata when no channels exist', async () => {
    walletRepository.findByUserId.mockResolvedValue({ id: 'wallet-1' } as any);
    paymentGateway.getOnRampChannels.mockResolvedValue([]);

    const result = await useCase.execute({
      userId: 'user-1',
      country: 'US',
      currency: 'USD',
    });

    expect(result).toMatchObject({
      country: 'US',
      currency: 'USD',
      status: 'unavailable',
      reason: 'no_deposit_channels_available',
      retryable: false,
      supportReviewRequired: true,
      channels: [],
    });
  });

  it('defaults to CI when no country is provided', async () => {
    walletRepository.findByUserId.mockResolvedValue({ id: 'wallet-1' } as any);
    paymentGateway.getOnRampChannels.mockResolvedValue([]);

    await useCase.execute({ userId: 'user-1' });

    expect(paymentGateway.getOnRampChannels).toHaveBeenCalledWith(
      'CI',
      undefined,
    );
  });

  it('rejects missing wallets before provider lookup', async () => {
    walletRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'missing-user' })).rejects.toThrow(
      NotFoundException,
    );
    expect(paymentGateway.getOnRampChannels).not.toHaveBeenCalled();
  });
});
