import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardService } from './card.service';
import { CardRepository } from '../../domain/repositories/card.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { CardEntity } from '../../domain/entities/card.entity';
import { WalletEntity } from '../../../wallet/domain/entities/wallet.entity';

describe('CardService', () => {
  let service: CardService;
  let cardRepository: jest.Mocked<CardRepository>;
  let walletRepository: jest.Mocked<WalletRepository>;

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
      ],
    }).compile();

    service = module.get<CardService>(CardService);
    cardRepository = module.get(CardRepository);
    walletRepository = module.get(WalletRepository);
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
        BadRequestException,
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
});
