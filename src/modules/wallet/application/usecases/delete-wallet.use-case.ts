import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

export interface DeleteWalletInput {
  walletId: string;
}

@Injectable()
export class DeleteWalletUseCase {
  constructor(private readonly repository: WalletRepository) {}

  async execute(input: DeleteWalletInput): Promise<void> {
    const wallet = await this.repository.findById(input.walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // In practice, you may want to check for pending transactions
    // and close the wallet instead of deleting it
    if (wallet.status !== 'closed') {
      throw new BadRequestException('Wallet must be closed before deletion');
    }

    await this.repository.delete(input.walletId);
  }
}
