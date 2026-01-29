import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BeneficiaryRepository } from '../../domain/repositories/beneficiary.repository';
import {
  Beneficiary,
  BeneficiaryAccountType,
} from '../../domain/entities/beneficiary.entity';
import {
  BeneficiaryOrmEntity,
  BeneficiaryAccountType as OrmAccountType,
} from '../orm-entities/beneficiary.orm-entity';
import { BeneficiaryMapper } from '../mappers/beneficiary.mapper';

@Injectable()
export class TypeOrmBeneficiaryRepository extends BeneficiaryRepository {
  constructor(
    @InjectRepository(BeneficiaryOrmEntity)
    private readonly repo: Repository<BeneficiaryOrmEntity>,
    private readonly mapper: BeneficiaryMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<Beneficiary | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByWalletId(walletId: string): Promise<Beneficiary[]> {
    const entities = await this.repo.find({
      where: { walletId },
      order: { isFavorite: 'DESC', lastTransferAt: 'DESC', name: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByWalletIdAndPhone(
    walletId: string,
    phoneE164: string,
  ): Promise<Beneficiary | null> {
    const entity = await this.repo.findOne({
      where: { walletId, phoneE164 },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findFavoritesByWalletId(walletId: string): Promise<Beneficiary[]> {
    const entities = await this.repo.find({
      where: { walletId, isFavorite: true },
      order: { lastTransferAt: 'DESC', name: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByAccountType(
    walletId: string,
    accountType: BeneficiaryAccountType,
  ): Promise<Beneficiary[]> {
    const entities = await this.repo.find({
      where: {
        walletId,
        accountType: accountType as unknown as OrmAccountType,
      },
      order: { lastTransferAt: 'DESC', name: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findRecentByWalletId(
    walletId: string,
    limit: number = 10,
  ): Promise<Beneficiary[]> {
    const entities = await this.repo.find({
      where: { walletId },
      order: { lastTransferAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(beneficiary: Beneficiary): Promise<Beneficiary> {
    const entity = this.mapper.toOrmEntity(beneficiary);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async countByWalletId(walletId: string): Promise<number> {
    return this.repo.count({ where: { walletId } });
  }
}
