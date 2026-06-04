import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CardService } from './card.service';
import { CardRepository } from '../../domain/repositories/card.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { CardEntity } from '../../domain/entities/card.entity';
import { WalletEntity } from '../../../wallet/domain/entities/wallet.entity';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

describe('CardService', () => {
  let service: CardService;
  let cardRepository: jest.Mocked<CardRepository>;
  let walletRepository: jest.Mocked<WalletRepository>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: CardRepository,
          useValue: {
            findByUserId: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: WalletRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'cards.issuingEnabled') return true;
              if (key === 'cards.issuingProvider') return 'test-issuer';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
    cardRepository = module.get(CardRepository);
    walletRepository = module.get(WalletRepository);
    configService = module.get(ConfigService);
  });

  describe('createCard', () => {
    it('should create a virtual card successfully', async () => {
      const userId = 'user-123';
      const dto = {
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      };

      const wallet = WalletEntity.create({ userId });
      cardRepository.findByUserId.mockResolvedValue([]);
      walletRepository.findByUserId.mockResolvedValue(wallet);
      cardRepository.save.mockImplementation(async (card) => card);

      const result = await service.createCard(userId, dto);

      expect(result.cardholderName).toBe('John Doe');
      expect(result.spendingLimit).toBe(1000);
      expect(result.cardType).toBe('virtual');
      expect(result.status).toBe('active');
      expect(cardRepository.save).toHaveBeenCalled();
    });

    it('should reject card creation when issuing provider is unavailable', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'cards.issuingEnabled') return false;
        if (key === 'cards.issuingProvider') return '';
        return undefined;
      });

      await expect(
        service.createCard('user-123', {
          cardholderName: 'John Doe',
          spendingLimit: 1000,
        }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.CARD_PROVIDER_UNAVAILABLE,
      });

      expect(cardRepository.findByUserId).not.toHaveBeenCalled();
      expect(walletRepository.findByUserId).not.toHaveBeenCalled();
      expect(cardRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if user already has a card', async () => {
      const userId = 'user-123';
      const dto = {
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      };

      const existingCard = CardEntity.create({
        userId,
        walletId: 'wallet-123',
        cardholderName: 'Existing Card',
        spendingLimit: 500,
      });

      cardRepository.findByUserId.mockResolvedValue([existingCard]);

      await expect(service.createCard(userId, dto)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw error if wallet not found', async () => {
      const userId = 'user-123';
      const dto = {
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      };

      cardRepository.findByUserId.mockResolvedValue([]);
      walletRepository.findByUserId.mockResolvedValue(null);

      await expect(service.createCard(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate spending limit minimum', async () => {
      const userId = 'user-123';
      const dto = {
        cardholderName: 'John Doe',
        spendingLimit: 5,
      };

      const wallet = WalletEntity.create({ userId });
      walletRepository.findByUserId.mockResolvedValue(wallet);
      cardRepository.findByUserId.mockResolvedValue([]);

      await expect(service.createCard(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate spending limit maximum', async () => {
      const userId = 'user-123';
      const dto = {
        cardholderName: 'John Doe',
        spendingLimit: 15000,
      };

      const wallet = WalletEntity.create({ userId });
      walletRepository.findByUserId.mockResolvedValue(wallet);
      cardRepository.findByUserId.mockResolvedValue([]);

      await expect(service.createCard(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('freezeCard', () => {
    it('should freeze an active card', async () => {
      const userId = 'user-123';
      const card = CardEntity.create({
        userId,
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });

      cardRepository.findById.mockResolvedValue(card);
      cardRepository.save.mockImplementation(async (c) => c);

      const result = await service.freezeCard(card.id, userId);

      expect(result.status).toBe('frozen');
      expect(result.frozenAt).toBeTruthy();
    });

    it('should throw error if card not found', async () => {
      cardRepository.findById.mockResolvedValue(null);

      await expect(service.freezeCard('card-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if card belongs to different user', async () => {
      const card = CardEntity.create({
        userId: 'user-456',
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });

      cardRepository.findById.mockResolvedValue(card);

      await expect(service.freezeCard(card.id, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unfreezeCard', () => {
    it('should unfreeze a frozen card', async () => {
      const userId = 'user-123';
      const card = CardEntity.create({
        userId,
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });
      card.freeze();

      cardRepository.findById.mockResolvedValue(card);
      cardRepository.save.mockImplementation(async (c) => c);

      const result = await service.unfreezeCard(card.id, userId);

      expect(result.status).toBe('active');
      expect(result.frozenAt).toBeNull();
    });
  });

  describe('updateSpendingLimit', () => {
    it('should update spending limit successfully', async () => {
      const userId = 'user-123';
      const card = CardEntity.create({
        userId,
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });

      cardRepository.findById.mockResolvedValue(card);
      cardRepository.save.mockImplementation(async (c) => c);

      const result = await service.updateSpendingLimit(card.id, userId, {
        spendingLimit: 2000,
      });

      expect(result.spendingLimit).toBe(2000);
    });
  });

  describe('cancelCard', () => {
    it('should cancel a card successfully', async () => {
      const userId = 'user-123';
      const card = CardEntity.create({
        userId,
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });

      cardRepository.findById.mockResolvedValue(card);
      cardRepository.save.mockImplementation(async (c) => c);

      await service.cancelCard(card.id, userId);

      expect(cardRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
    });
  });

  describe('getCardTransactions', () => {
    it('should return an empty paginated response for owned cards', async () => {
      const userId = 'user-123';
      const card = CardEntity.create({
        userId,
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });

      cardRepository.findById.mockResolvedValue(card);

      await expect(
        service.getCardTransactions(card.id, userId, 10, 20),
      ).resolves.toEqual({
        data: [],
        transactions: [],
        total: 0,
        limit: 10,
        offset: 20,
      });
    });

    it('should reject card transactions for cards owned by another user', async () => {
      const card = CardEntity.create({
        userId: 'user-456',
        walletId: 'wallet-123',
        cardholderName: 'John Doe',
        spendingLimit: 1000,
      });

      cardRepository.findById.mockResolvedValue(card);

      await expect(
        service.getCardTransactions(card.id, 'user-123', 10, 0),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
