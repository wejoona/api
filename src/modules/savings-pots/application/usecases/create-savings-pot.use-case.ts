import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { CreateSavingsPotDto } from '../dtos/create-savings-pot.dto';

@Injectable()
export class CreateSavingsPotUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
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

    return this.savingsPotRepository.save(savingsPot);
  }
}
