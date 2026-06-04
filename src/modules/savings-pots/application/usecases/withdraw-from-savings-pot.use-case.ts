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
import { WithdrawFromSavingsPotDto } from '../dtos/deposit-withdraw.dto';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

@Injectable()
export class WithdrawFromSavingsPotUseCase {
  private readonly logger = new Logger(WithdrawFromSavingsPotUseCase.name);

  constructor(
    private readonly savingsPotRepository: SavingsPotRepository,
    private readonly walletRepository: WalletRepository,
    private readonly dataSource: DataSource,
    private readonly savingsPotMapper: SavingsPotMapper,
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
      throw AppException.notFound(
        ERROR_CODES.SAVINGS_POT_NOT_FOUND,
        'Savings pot not found',
      );
    }

    if (!savingsPot.canWithdraw) {
      if (
        savingsPot.isLocked &&
        savingsPot.lockUntil &&
        new Date() < savingsPot.lockUntil
      ) {
        throw AppException.badRequest(
          ERROR_CODES.SAVINGS_POT_LOCKED,
          `Savings pot is locked until ${savingsPot.lockUntil.toISOString()}`,
        );
      }
      throw new BadRequestException('Cannot withdraw from this savings pot');
    }

    if (savingsPot.currentAmount < dto.amount) {
      throw AppException.badRequest(
        ERROR_CODES.SAVINGS_POT_INSUFFICIENT_FUNDS,
        'Insufficient balance in savings pot',
      );
    }

    // Apply domain mutations
    savingsPot.withdraw(dto.amount);
    wallet.credit(dto.amount);

    // Save both in a DB transaction to ensure atomicity
    let saved: SavingsPotEntity;
    await this.dataSource.transaction(async (manager) => {
      const walletOrm = await manager.findOne(WalletOrmEntity, {
        where: { id: wallet.id },
      });
      if (walletOrm) {
        walletOrm.balance = wallet.balance;
        await manager.save(walletOrm);
      }

      const potOrm = this.savingsPotMapper.toOrmEntity(savingsPot);
      const savedOrm = await manager.save(SavingsPotOrmEntity, potOrm);
      saved = this.savingsPotMapper.toDomainEntity(savedOrm);
    });

    this.eventEmitter.emit('savings.withdrawal.completed', {
      userId,
      savingsPotId,
      amount: dto.amount,
      timestamp: new Date(),
    });

    return saved!;
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
      throw AppException.notFound(
        ERROR_CODES.SAVINGS_POT_NOT_FOUND,
        'Savings pot not found',
      );
    }

    if (!savingsPot.canWithdraw) {
      if (
        savingsPot.isLocked &&
        savingsPot.lockUntil &&
        new Date() < savingsPot.lockUntil
      ) {
        throw AppException.badRequest(
          ERROR_CODES.SAVINGS_POT_LOCKED,
          `Savings pot is locked until ${savingsPot.lockUntil.toISOString()}`,
        );
      }
      throw new BadRequestException('Cannot withdraw from this savings pot');
    }

    if (savingsPot.currentAmount <= 0) {
      throw AppException.badRequest(
        ERROR_CODES.SAVINGS_POT_INSUFFICIENT_FUNDS,
        'Savings pot has no funds to withdraw',
      );
    }

    // Apply domain mutations
    const amount = savingsPot.withdrawAll();
    wallet.credit(amount);

    // Save both in a DB transaction to ensure atomicity
    let saved: SavingsPotEntity;
    await this.dataSource.transaction(async (manager) => {
      const walletOrm = await manager.findOne(WalletOrmEntity, {
        where: { id: wallet.id },
      });
      if (walletOrm) {
        walletOrm.balance = wallet.balance;
        await manager.save(walletOrm);
      }

      const potOrm = this.savingsPotMapper.toOrmEntity(savingsPot);
      const savedOrm = await manager.save(SavingsPotOrmEntity, potOrm);
      saved = this.savingsPotMapper.toDomainEntity(savedOrm);
    });

    this.eventEmitter.emit('savings.withdrawal.completed', {
      userId,
      savingsPotId,
      amount,
      timestamp: new Date(),
    });

    return saved!;
  }
}
