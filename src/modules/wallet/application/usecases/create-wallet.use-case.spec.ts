import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateWalletInput,
  CreateWalletUseCase,
} from './create-wallet.use-case';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  ILedgerProvider,
  LEDGER_PROVIDER,
} from '../../../providers/interfaces';

describe('CreateWalletUseCase', () => {
  let useCase: CreateWalletUseCase;
  let walletRepository: { findByUserId: jest.Mock; save: jest.Mock };
  let ledgerProvider: jest.Mocked<Pick<ILedgerProvider, 'createUserBalance'>>;
  let eventEmitter: { emit: jest.Mock };

  const input: CreateWalletInput = {
    userId: 'user-123',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    userPhone: '+225123456789',
    countryCode: 'CI',
  };

  beforeEach(async () => {
    walletRepository = {
      findByUserId: jest.fn(),
      save: jest.fn().mockImplementation(async (wallet) => wallet),
    };
    ledgerProvider = {
      createUserBalance: jest.fn().mockResolvedValue('blnk-balance-123'),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWalletUseCase,
        { provide: WalletRepository, useValue: walletRepository },
        { provide: LEDGER_PROVIDER, useValue: ledgerProvider },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    useCase = module.get<CreateWalletUseCase>(CreateWalletUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a Blnk-backed local wallet without creating per-user provider wallets', async () => {
    walletRepository.findByUserId.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(ledgerProvider.createUserBalance).toHaveBeenCalledWith(
      'user-123',
      'USDC',
    );
    expect(walletRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        blnkBalanceId: 'blnk-balance-123',
        currency: 'USDC',
        circleWalletId: null,
        circleWalletAddress: null,
        yellowCardWalletId: null,
      }),
    );
    expect(result.blnkBalanceId).toBe('blnk-balance-123');
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'wallet.created',
      expect.objectContaining({
        userId: 'user-123',
        blnkBalanceId: 'blnk-balance-123',
        currency: 'USDC',
      }),
    );
  });

  it('returns an existing wallet that is already linked to Blnk', async () => {
    const existingWallet = WalletEntity.create({
      userId: 'user-123',
      blnkBalanceId: 'existing-blnk-balance',
    });
    walletRepository.findByUserId.mockResolvedValue(existingWallet);

    const result = await useCase.execute({ userId: 'user-123' });

    expect(result).toBe(existingWallet);
    expect(ledgerProvider.createUserBalance).not.toHaveBeenCalled();
    expect(walletRepository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('links an existing wallet to Blnk as a migration path', async () => {
    const existingWallet = WalletEntity.create({ userId: 'user-123' });
    walletRepository.findByUserId.mockResolvedValue(existingWallet);

    const result = await useCase.execute({ userId: 'user-123' });

    expect(ledgerProvider.createUserBalance).toHaveBeenCalledWith(
      'user-123',
      'USDC',
    );
    expect(existingWallet.blnkBalanceId).toBe('blnk-balance-123');
    expect(walletRepository.save).toHaveBeenCalledWith(existingWallet);
    expect(result).toBe(existingWallet);
  });

  it('still creates the local wallet if Blnk is temporarily unavailable', async () => {
    walletRepository.findByUserId.mockResolvedValue(null);
    ledgerProvider.createUserBalance.mockRejectedValue(
      new Error('Blnk API error'),
    );

    const result = await useCase.execute({ userId: 'user-123' });

    expect(result.userId).toBe('user-123');
    expect(result.blnkBalanceId).toBeNull();
    expect(walletRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        blnkBalanceId: null,
        currency: 'USDC',
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'wallet.created',
      expect.objectContaining({
        userId: 'user-123',
        blnkBalanceId: undefined,
      }),
    );
  });

  it('does not fail existing wallet lookup when migration balance creation fails', async () => {
    const existingWallet = WalletEntity.create({ userId: 'user-123' });
    walletRepository.findByUserId.mockResolvedValue(existingWallet);
    ledgerProvider.createUserBalance.mockRejectedValue(new Error('Blnk down'));

    const result = await useCase.execute({ userId: 'user-123' });

    expect(result).toBe(existingWallet);
    expect(walletRepository.save).not.toHaveBeenCalled();
  });
});
