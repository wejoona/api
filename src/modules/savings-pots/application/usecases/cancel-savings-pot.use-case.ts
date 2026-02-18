import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { SavingsPotRepository } from '../../infrastructure/repositories/savings-pot.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import { SavingsPotEntity } from '../../domain/entities/savings-pot.entity';
import { SavingsPotOrmEntity } from '../../infrastructure/orm-entities/savings-pot.orm-entity';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities/wallet.orm-entity';
import { SavingsPotMapper } from '../../infrastructure/mappers/savings-pot.mapper';

@Injectable()
export class CancelSavingsPotUseCase {
  private readonly logger = new Logger(CancelSavingsPotUseCase.name);

  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
    private readonly dataSource: DataSource,
    private readonly savingsPotMapper: SavingsPotMapper,
    private readonly eventEmitter: EventEmitter2,
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

    // Return funds to wallet and cancel - all in a DB transaction
    const refundAmount = savingsPot.currentAmount;
    if (refundAmount > 0) {
      wallet.credit(refundAmount);
      savingsPot.withdrawAll();
    }
    savingsPot.cancel();

    let saved: SavingsPotEntity;
    await this.dataSource.transaction(async (manager) => {
      if (refundAmount > 0) {
        const walletOrm = await manager.findOne(WalletOrmEntity, {
          where: { id: wallet.id },
        });
        if (walletOrm) {
          walletOrm.balance = wallet.balance;
          await manager.save(walletOrm);
        }
      }

      const potOrm = this.savingsPotMapper.toOrmEntity(savingsPot);
      const savedOrm = await manager.save(SavingsPotOrmEntity, potOrm);
      saved = this.savingsPotMapper.toDomainEntity(savedOrm);
    });

    this.eventEmitter.emit('savings.pot.cancelled', {
      userId,
      savingsPotId,
      refundAmount,
      timestamp: new Date(),
    });

    return saved!;
  }
}
