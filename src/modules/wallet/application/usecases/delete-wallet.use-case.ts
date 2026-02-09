import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DeleteWalletInput {
  walletId: string;
}

@Injectable()
export class DeleteWalletUseCase {
  constructor(
    private readonly repository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

    this.eventEmitter.emit('wallet.deleted', {
      walletId: input.walletId,
      userId: wallet.userId,
      timestamp: new Date(),
    });
  }
}
