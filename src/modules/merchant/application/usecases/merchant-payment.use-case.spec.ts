import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProcessMerchantPaymentUseCase } from './merchant-payment.use-case';
import { MerchantEntity } from '../../domain/entities/merchant.entity';

describe('ProcessMerchantPaymentUseCase', () => {
  let useCase: ProcessMerchantPaymentUseCase;
  let merchantRepository: { findById: jest.Mock; save: jest.Mock };
  let paymentRequestRepository: {
    findByRequestId: jest.Mock;
    findById: jest.Mock;
    save: jest.Mock;
  };
  let merchantPaymentRepository: { save: jest.Mock };
  let walletRepository: { findByUserId: jest.Mock; findById: jest.Mock };
  let qrCodeService: { decodeQr: jest.Mock };
  let ledgerProvider: {
    getUserBalance: jest.Mock;
    recordP2PTransfer: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  const customerId = 'customer-user-id';
  const merchantOwnerId = 'merchant-owner-id';
  const merchantWalletId = 'merchant-wallet-id';
  const customerWallet = { id: 'customer-wallet-id' };
  const merchantWallet = { id: merchantWalletId };

  const makeMerchant = () =>
    MerchantEntity.reconstitute({
      id: 'merchant-id',
      businessName: 'Korido Shop',
      displayName: 'Korido Shop',
      ownerId: merchantOwnerId,
      category: 'retail',
      country: 'CI',
      walletId: merchantWalletId,
      qrCode: 'qr',
      isVerified: true,
      feePercent: 1.5,
      dailyLimit: 10000,
      monthlyLimit: 100000,
      dailyVolume: 0,
      monthlyVolume: 0,
      totalTransactions: 0,
      status: 'active',
      createdAt: new Date('2026-06-04T00:00:00.000Z'),
      updatedAt: new Date('2026-06-04T00:00:00.000Z'),
    });

  beforeEach(() => {
    merchantRepository = {
      findById: jest.fn().mockResolvedValue(makeMerchant()),
      save: jest.fn().mockImplementation(async (merchant) => merchant),
    };
    paymentRequestRepository = {
      findByRequestId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    merchantPaymentRepository = {
      save: jest.fn().mockImplementation(async (payment) => payment),
    };
    walletRepository = {
      findByUserId: jest.fn().mockResolvedValue(customerWallet),
      findById: jest.fn().mockResolvedValue(merchantWallet),
    };
    qrCodeService = {
      decodeQr: jest.fn().mockReturnValue({
        version: 1,
        type: 'static',
        merchantId: 'merchant-id',
        currency: 'USDC',
        description: 'Coffee',
        timestamp: Date.now(),
        signature: 'sig',
      }),
    };
    ledgerProvider = {
      getUserBalance: jest.fn().mockResolvedValue({
        availableBalance: 75_000_000n,
      }),
      recordP2PTransfer: jest.fn().mockResolvedValue({
        transactionId: 'ledger-tx-123',
      }),
    };
    eventEmitter = { emit: jest.fn() };

    useCase = new ProcessMerchantPaymentUseCase(
      merchantRepository as any,
      paymentRequestRepository as any,
      merchantPaymentRepository as any,
      walletRepository as any,
      qrCodeService as any,
      ledgerProvider as any,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('checks and records merchant payments in micro-USDC ledger units', async () => {
    await useCase.execute({
      customerId,
      qrData: 'static-qr',
      amount: 50,
    });

    expect(ledgerProvider.getUserBalance).toHaveBeenCalledWith(
      customerId,
      'USDC',
    );
    expect(ledgerProvider.recordP2PTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId: customerId,
        recipientId: merchantOwnerId,
        amount: 50_000_000n,
        currency: 'USDC',
      }),
    );
  });

  it('rejects when the Blnk available balance is below the micro-USDC amount', async () => {
    ledgerProvider.getUserBalance.mockResolvedValue({
      availableBalance: 4_999_999n,
    });

    await expect(
      useCase.execute({
        customerId,
        qrData: 'static-qr',
        amount: 5,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(ledgerProvider.recordP2PTransfer).not.toHaveBeenCalled();
  });
});
