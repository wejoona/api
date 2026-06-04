import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BankLinkingService } from './bank-linking.service';
import { LinkedBankAccountRepository } from '../../domain/repositories/linked-bank-account.repository';
import { BankRepository } from '../../domain/repositories/bank.repository';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

describe('BankLinkingService', () => {
  let service: BankLinkingService;
  let linkedBankAccountRepository: jest.Mocked<LinkedBankAccountRepository>;
  let bankRepository: jest.Mocked<BankRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankLinkingService,
        {
          provide: LinkedBankAccountRepository,
          useValue: {
            findById: jest.fn(),
            findByWalletId: jest.fn(),
            findPrimaryByWalletId: jest.fn(),
            findVerifiedByWalletId: jest.fn(),
            countByWalletId: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            unsetAllPrimaryForWallet: jest.fn(),
          },
        },
        {
          provide: BankRepository,
          useValue: {
            findByCode: jest.fn(),
            findAll: jest.fn(),
            findByCountry: jest.fn(),
            findActive: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'bankLinking.enabled') return false;
              if (key === 'bankLinking.provider') return '';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(BankLinkingService);
    linkedBankAccountRepository = module.get(LinkedBankAccountRepository);
    bankRepository = module.get(BankRepository);
  });

  it('should return an empty bank list without touching repositories when provider is disabled', async () => {
    await expect(service.getBanks('CI')).resolves.toEqual([]);

    expect(bankRepository.findByCountry).not.toHaveBeenCalled();
    expect(bankRepository.findActive).not.toHaveBeenCalled();
  });

  it('should reject linking before local persistence when provider is disabled', async () => {
    await expect(
      service.linkBankAccount({
        walletId: 'wallet-123',
        bankCode: 'SGBCI',
        accountNumber: '1234567890',
        accountHolderName: 'Test User',
        countryCode: 'CI',
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.BANK_LINKING_UNAVAILABLE,
    });

    expect(linkedBankAccountRepository.countByWalletId).not.toHaveBeenCalled();
    expect(bankRepository.findByCode).not.toHaveBeenCalled();
    expect(linkedBankAccountRepository.save).not.toHaveBeenCalled();
  });

  it('should reject bank money movement before account lookup when provider is disabled', async () => {
    await expect(
      service.deposit({
        walletId: 'wallet-123',
        accountId: 'account-123',
        amount: 100,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.BANK_LINKING_UNAVAILABLE,
    });

    await expect(
      service.withdraw({
        walletId: 'wallet-123',
        accountId: 'account-123',
        amount: 100,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.BANK_LINKING_UNAVAILABLE,
    });

    expect(linkedBankAccountRepository.findById).not.toHaveBeenCalled();
  });
});
