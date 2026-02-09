import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { DepositToSavingsPotDto } from '../dtos/deposit-withdraw.dto';

@Injectable()
export class DepositToSavingsPotUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    savingsPotId: string,
    dto: DepositToSavingsPotDto,
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
      throw new BadRequestException(
        'Cannot deposit to a non-active savings pot',
      );
    }

    // Check wallet balance
    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Debit wallet and credit savings pot
    wallet.debit(dto.amount);
    savingsPot.deposit(dto.amount);

    // Save both entities
    await this.walletRepository.save(wallet);
    const saved = await this.savingsPotRepository.save(savingsPot);

    this.eventEmitter.emit('savings.deposit.completed', {
      userId,
      savingsPotId,
      amount: dto.amount,
      timestamp: new Date(),
    });

    return saved;
  }
}
