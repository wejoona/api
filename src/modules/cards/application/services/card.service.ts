import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CardRepository } from '../../domain/repositories/card.repository';
import { CardEntity } from '../../domain/entities/card.entity';
import { CreateCardDto } from '../dto/create-card.dto';
import { UpdateSpendingLimitDto } from '../dto/update-card.dto';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

@Injectable()
export class CardService {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async createCard(userId: string, dto: CreateCardDto): Promise<CardEntity> {
    if (!this.isIssuingEnabled()) {
      throw AppException.badRequest(
        ERROR_CODES.CARD_PROVIDER_UNAVAILABLE,
        'Virtual card issuing is not available yet',
        undefined,
        {
          reason: 'provider_or_feature_disabled',
          featureReason: 'card_issuing_unavailable',
          provider: this.getIssuingProvider(),
        },
      );
    }

    // Check if user already has a card (limit 1 per user for now)
    const existingCards = await this.cardRepository.findByUserId(userId);
    if (existingCards.length > 0) {
      throw AppException.badRequest(
        ERROR_CODES.CARD_ALREADY_EXISTS,
        'User already has a virtual card',
      );
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

    const saved = await this.cardRepository.save(card);

    this.eventEmitter.emit('card.created', {
      userId,
      cardId: saved.id,
      cardType: dto.cardType || 'virtual',
      timestamp: new Date(),
    });

    return saved;
  }

  async getCards(userId: string): Promise<CardEntity[]> {
    return this.cardRepository.findByUserId(userId);
  }

  isIssuingEnabled(): boolean {
    return this.configService.get<boolean>('cards.issuingEnabled') === true;
  }

  getIssuingProvider(): string | null {
    return this.configService.get<string>('cards.issuingProvider') || null;
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

  async getCardTransactions(
    cardId: string,
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{
    data: unknown[];
    transactions: unknown[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.getCard(cardId, userId);

    return {
      data: [],
      transactions: [],
      total: 0,
      limit,
      offset,
    };
  }

  async freezeCard(cardId: string, userId: string): Promise<CardEntity> {
    const card = await this.getCard(cardId, userId);
    card.freeze();
    const saved = await this.cardRepository.save(card);
    this.eventEmitter.emit('card.frozen', {
      userId,
      cardId,
      timestamp: new Date(),
    });
    return saved;
  }

  async unfreezeCard(cardId: string, userId: string): Promise<CardEntity> {
    const card = await this.getCard(cardId, userId);
    card.unfreeze();
    const saved = await this.cardRepository.save(card);
    this.eventEmitter.emit('card.unfrozen', {
      userId,
      cardId,
      timestamp: new Date(),
    });
    return saved;
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
    this.eventEmitter.emit('card.cancelled', {
      userId,
      cardId,
      timestamp: new Date(),
    });
  }
}
