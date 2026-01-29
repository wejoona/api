import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';

@Injectable()
export class CancelSavingsPotUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(
    savingsPotId: string,
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
      throw new BadRequestException('Savings pot is not active');
    }

    // If locked, check if can cancel
    if (
      savingsPot.isLocked &&
      savingsPot.lockUntil &&
      new Date() < savingsPot.lockUntil
    ) {
      throw new BadRequestException(
        `Cannot cancel a locked savings pot. Locked until ${savingsPot.lockUntil.toISOString()}`,
      );
    }

    // Return funds to wallet if any
    if (savingsPot.currentAmount > 0) {
      wallet.credit(savingsPot.currentAmount);
      savingsPot.withdrawAll();
      await this.walletRepository.save(wallet);
    }

    // Cancel the savings pot
    savingsPot.cancel();

    return this.savingsPotRepository.save(savingsPot);
  }
}
