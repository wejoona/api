import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { WithdrawFromSavingsPotDto } from '../dtos/deposit-withdraw.dto';

@Injectable()
export class WithdrawFromSavingsPotUseCase {
  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    savingsPotId: string,
    dto: WithdrawFromSavingsPotDto,
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

    if (!savingsPot.canWithdraw) {
      if (
        savingsPot.isLocked &&
        savingsPot.lockUntil &&
        new Date() < savingsPot.lockUntil
      ) {
        throw new BadRequestException(
          `Savings pot is locked until ${savingsPot.lockUntil.toISOString()}`,
        );
      }
      throw new BadRequestException('Cannot withdraw from this savings pot');
    }

    if (savingsPot.currentAmount < dto.amount) {
      throw new BadRequestException('Insufficient balance in savings pot');
    }

    // Debit savings pot and credit wallet
    savingsPot.withdraw(dto.amount);
    wallet.credit(dto.amount);

    // Save both entities
    await this.walletRepository.save(wallet);
    const saved = await this.savingsPotRepository.save(savingsPot);

    this.eventEmitter.emit('savings.withdrawal.completed', {
      userId,
      savingsPotId,
      amount: dto.amount,
      timestamp: new Date(),
    });

    return saved;
  }

  async executeAll(
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

    if (!savingsPot.canWithdraw) {
      if (
        savingsPot.isLocked &&
        savingsPot.lockUntil &&
        new Date() < savingsPot.lockUntil
      ) {
        throw new BadRequestException(
          `Savings pot is locked until ${savingsPot.lockUntil.toISOString()}`,
        );
      }
      throw new BadRequestException('Cannot withdraw from this savings pot');
    }

    // Withdraw all and credit wallet
    const amount = savingsPot.withdrawAll();
    wallet.credit(amount);

    // Save both entities
    await this.walletRepository.save(wallet);
    const saved = await this.savingsPotRepository.save(savingsPot);

    this.eventEmitter.emit('savings.withdrawal.completed', {
      userId,
      savingsPotId,
      amount,
      timestamp: new Date(),
    });

    return saved;
  }
}
