import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { UpdateSavingsPotDto } from '../dtos/update-savings-pot.dto';

@Injectable()
export class UpdateSavingsPotUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(
    savingsPotId: string,
    dto: UpdateSavingsPotDto,
    userId: string,
  ): Promise<SavingsPotEntity> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const savingsPot = await this.savingsPotRepository.findById(savingsPotId);
    if (!savingsPot || savingsPot.walletId !== wallet.id) {
      throw new NotFoundException('Savings pot not found');
    }

    if (!savingsPot.isActive) {
      throw new BadRequestException('Cannot update a non-active savings pot');
    }

    // Update name
    if (dto.name !== undefined) {
      savingsPot.updateName(dto.name);
    }

    // Update target amount
    if (dto.targetAmount !== undefined) {
      savingsPot.updateTargetAmount(dto.targetAmount);
    }

    // Update target date
    if (dto.targetDate !== undefined) {
      savingsPot.updateTargetDate(
        dto.targetDate ? new Date(dto.targetDate) : null,
      );
    }

    // Update auto deposit
    if (
      dto.autoDepositAmount !== undefined ||
      dto.autoDepositFrequency !== undefined
    ) {
      const amount = dto.autoDepositAmount ?? savingsPot.autoDepositAmount;
      const frequency =
        dto.autoDepositFrequency ?? savingsPot.autoDepositFrequency;

      if ((amount && !frequency) || (!amount && frequency)) {
        throw new BadRequestException(
          'Both auto deposit amount and frequency must be provided together',
        );
      }

      savingsPot.setAutoDeposit(amount, frequency);
    }

    // Update lock settings
    if (dto.isLocked !== undefined || dto.lockUntil !== undefined) {
      if (dto.isLocked === true) {
        const lockUntil = dto.lockUntil
          ? new Date(dto.lockUntil)
          : savingsPot.lockUntil;
        if (!lockUntil) {
          throw new BadRequestException(
            'Lock until date is required when locking a savings pot',
          );
        }
        savingsPot.lock(lockUntil);
      } else if (dto.isLocked === false) {
        savingsPot.unlock();
      }
    }

    return this.savingsPotRepository.save(savingsPot);
  }
}
