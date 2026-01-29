import { Injectable, NotFoundException } from '@nestjs/common';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';

@Injectable()
export class GetSavingsPotsUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(userId: string): Promise<SavingsPotEntity[]> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.savingsPotRepository.findByWalletId(wallet.id);
  }

  async executeOne(
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

    return savingsPot;
  }

  async executeActive(userId: string): Promise<SavingsPotEntity[]> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.savingsPotRepository.findActiveByWalletId(wallet.id);
  }
}
