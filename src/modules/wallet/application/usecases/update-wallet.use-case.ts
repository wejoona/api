import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

export interface UpdateWalletInput {
  walletId: string;
  status?: 'active' | 'suspended';
}

@Injectable()
export class UpdateWalletUseCase {
  constructor(private readonly repository: WalletRepository) {}

  async execute(input: UpdateWalletInput): Promise<WalletEntity> {
    const wallet = await this.repository.findById(input.walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (input.status === 'active') {
      wallet.activate();
    } else if (input.status === 'suspended') {
      wallet.suspend();
    }

    return this.repository.save(wallet);
  }
}
