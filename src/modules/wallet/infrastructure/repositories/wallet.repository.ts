import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletMapper } from '../mappers/wallet.mapper';
import { WalletOrmEntity } from '../orm-entities/wallet.orm-entity';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(
    @InjectRepository(WalletOrmEntity)
    private readonly repository: Repository<WalletOrmEntity>,
    private readonly mapper: WalletMapper,
  ) {}

  async save(entity: WalletEntity): Promise<WalletEntity> {
    const ormEntity = this.mapper.toOrmEntity(entity);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return this.mapper.toDomainEntity(savedOrmEntity);
  }

  async findById(id: string): Promise<WalletEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { id },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByUserId(userId: string): Promise<WalletEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { userId },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByYellowCardWalletId(
    yellowCardWalletId: string,
  ): Promise<WalletEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { yellowCardWalletId },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByCircleWalletId(
    circleWalletId: string,
  ): Promise<WalletEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { circleWalletId },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  // Generic alias for provider wallet ID lookup (now uses Circle as primary)
  async findByProviderWalletId(
    providerWalletId: string,
  ): Promise<WalletEntity | null> {
    // Try Circle first, then Yellow Card for backwards compatibility
    const circleWallet = await this.findByCircleWalletId(providerWalletId);
    if (circleWallet) {
      return circleWallet;
    }
    return this.findByYellowCardWalletId(providerWalletId);
  }

  async findAll(): Promise<WalletEntity[]> {
    const ormEntities = await this.repository.find();
    if (!ormEntities) {
      return [];
    }
    return ormEntities.map((ormEntity) =>
      this.mapper.toDomainEntity(ormEntity),
    );
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
