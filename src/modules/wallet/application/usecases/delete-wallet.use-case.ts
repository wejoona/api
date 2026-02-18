import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SavingsPotRepository } from '../../../savings-pots/infrastructure/repositories/savings-pot.repository';

export interface DeleteWalletInput {
  walletId: string;
}

@Injectable()
export class DeleteWalletUseCase {
  constructor(
    private readonly repository: WalletRepository,
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: DeleteWalletInput): Promise<void> {
    const wallet = await this.repository.findById(input.walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.status !== 'closed') {
      throw new BadRequestException('Wallet must be closed before deletion');
    }

    // Check for savings pots with remaining funds
    const activePots = await this.savingsPotRepository.findActiveByWalletId(input.walletId);
    if (activePots.length > 0) {
      const potsWithFunds = activePots.filter(pot => pot.currentAmount > 0);
      if (potsWithFunds.length > 0) {
        throw new BadRequestException(
          `Cannot delete wallet: ${potsWithFunds.length} savings pot(s) still have funds. Cancel them first.`,
        );
      }
    }

    // Check balance is zero
    if (wallet.balance > 0) {
      throw new BadRequestException(
        'Cannot delete wallet with remaining balance. Withdraw or transfer funds first.',
      );
    }

    await this.repository.delete(input.walletId);

    this.eventEmitter.emit('wallet.deleted', {
      walletId: input.walletId,
      userId: wallet.userId,
      timestamp: new Date(),
    });
  }
}
