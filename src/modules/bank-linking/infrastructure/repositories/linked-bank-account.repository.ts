import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkedBankAccountRepository as ILinkedBankAccountRepository } from '../../domain/repositories/linked-bank-account.repository';
import { LinkedBankAccount } from '../../domain/entities/linked-bank-account.entity';
import { LinkedBankAccountOrmEntity } from '../orm-entities/linked-bank-account.orm-entity';
import { LinkedBankAccountMapper } from '../mappers/linked-bank-account.mapper';

@Injectable()
export class TypeOrmLinkedBankAccountRepository extends ILinkedBankAccountRepository {
  constructor(
    @InjectRepository(LinkedBankAccountOrmEntity)
    private readonly repo: Repository<LinkedBankAccountOrmEntity>,
    private readonly mapper: LinkedBankAccountMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<LinkedBankAccount | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByWalletId(walletId: string): Promise<LinkedBankAccount[]> {
    const entities = await this.repo.find({
      where: { walletId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findPrimaryByWalletId(
    walletId: string,
  ): Promise<LinkedBankAccount | null> {
    const entity = await this.repo.findOne({
      where: { walletId, isPrimary: true },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findVerifiedByWalletId(walletId: string): Promise<LinkedBankAccount[]> {
    const entities = await this.repo.find({
      where: { walletId, isVerified: true },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async countByWalletId(walletId: string): Promise<number> {
    return this.repo.count({ where: { walletId } });
  }

  async save(account: LinkedBankAccount): Promise<LinkedBankAccount> {
    const entity = this.mapper.toOrmEntity(account);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async unsetAllPrimaryForWallet(walletId: string): Promise<void> {
    await this.repo.update({ walletId }, { isPrimary: false });
  }
}
