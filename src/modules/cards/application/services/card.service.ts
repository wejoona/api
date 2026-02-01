import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CardRepository } from '../../domain/repositories/card.repository';
import { CardEntity } from '../../domain/entities/card.entity';
import { CreateCardDto } from '../dto/create-card.dto';
import { UpdateSpendingLimitDto } from '../dto/update-card.dto';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';

@Injectable()
export class CardService {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async createCard(userId: string, dto: CreateCardDto): Promise<CardEntity> {
    // Check if user already has a card (limit 1 per user for now)
    const existingCards = await this.cardRepository.findByUserId(userId);
    if (existingCards.length > 0) {
      throw new BadRequestException('User already has a virtual card');
    }

    // Get user's wallet
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Validate spending limit
    if (dto.spendingLimit < 10) {
      throw new BadRequestException('Spending limit must be at least $10');
    }
    if (dto.spendingLimit > 10000) {
      throw new BadRequestException('Spending limit cannot exceed $10,000');
    }

    // Create card
    const card = CardEntity.create({
      userId,
      walletId: wallet.id,
      cardholderName: dto.cardholderName,
      spendingLimit: dto.spendingLimit,
      cardType: dto.cardType || 'virtual',
    });

    return this.cardRepository.save(card);
  }

  async getCards(userId: string): Promise<CardEntity[]> {
    return this.cardRepository.findByUserId(userId);
  }

  async getCard(cardId: string, userId: string): Promise<CardEntity> {
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.userId !== userId) {
      throw new NotFoundException('Card not found');
    }
    return card;
  }

  async freezeCard(cardId: string, userId: string): Promise<CardEntity> {
    const card = await this.getCard(cardId, userId);
    card.freeze();
    return this.cardRepository.save(card);
  }

  async unfreezeCard(cardId: string, userId: string): Promise<CardEntity> {
    const card = await this.getCard(cardId, userId);
    card.unfreeze();
    return this.cardRepository.save(card);
  }

  async updateSpendingLimit(
    cardId: string,
    userId: string,
    dto: UpdateSpendingLimitDto,
  ): Promise<CardEntity> {
    const card = await this.getCard(cardId, userId);
    card.updateSpendingLimit(dto.spendingLimit);
    return this.cardRepository.save(card);
  }

  async cancelCard(cardId: string, userId: string): Promise<void> {
    const card = await this.getCard(cardId, userId);
    card.cancel();
    await this.cardRepository.save(card);
  }
}
