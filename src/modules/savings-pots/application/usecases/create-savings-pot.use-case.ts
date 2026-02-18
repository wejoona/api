import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { CreateSavingsPotDto } from '../dtos/create-savings-pot.dto';

@Injectable()
export class CreateSavingsPotUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: CreateSavingsPotDto,
    userId: string,
  ): Promise<SavingsPotEntity> {
    // Get user's wallet
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Limit number of savings pots per wallet
    const existingPots = await this.savingsPotRepository.findActiveByWalletId(wallet.id);
    if (existingPots.length >= 20) {
      throw new BadRequestException(
        'Maximum number of active savings pots (20) reached',
      );
    }

    // Validate auto deposit settings
    if (
      (dto.autoDepositAmount && !dto.autoDepositFrequency) ||
      (!dto.autoDepositAmount && dto.autoDepositFrequency)
    ) {
      throw new BadRequestException(
        'Both auto deposit amount and frequency must be provided together',
      );
    }

    // Validate lock settings
    if (dto.isLocked && !dto.lockUntil) {
      throw new BadRequestException(
        'Lock until date is required when locking a savings pot',
      );
    }

    if (dto.lockUntil && new Date(dto.lockUntil) <= new Date()) {
      throw new BadRequestException('Lock until date must be in the future');
    }

    // Create savings pot
    const savingsPot = SavingsPotEntity.create({
      walletId: wallet.id,
      name: dto.name,
      targetAmount: dto.targetAmount,
      currency: dto.currency || wallet.currency,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      isLocked: dto.isLocked,
      lockUntil: dto.lockUntil ? new Date(dto.lockUntil) : undefined,
      autoDepositAmount: dto.autoDepositAmount,
      autoDepositFrequency: dto.autoDepositFrequency,
    });

    const saved = await this.savingsPotRepository.save(savingsPot);

    this.eventEmitter.emit('savings.pot.created', {
      userId,
      savingsPotId: saved.id,
      name: dto.name,
      targetAmount: dto.targetAmount,
      timestamp: new Date(),
    });

    return saved;
  }
}
