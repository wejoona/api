import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankRepository as IBankRepository } from '../../domain/repositories/bank.repository';
import { Bank } from '../../domain/entities/bank.entity';
import { BankOrmEntity } from '../orm-entities/bank.orm-entity';
import { BankMapper } from '../mappers/bank.mapper';

@Injectable()
export class TypeOrmBankRepository extends IBankRepository {
  constructor(
    @InjectRepository(BankOrmEntity)
    private readonly repo: Repository<BankOrmEntity>,
    private readonly mapper: BankMapper,
  ) {
    super();
  }

  async findByCode(code: string): Promise<Bank | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Bank[]> {
    const entities = await this.repo.find({
      order: { name: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByCountry(country: string): Promise<Bank[]> {
    const entities = await this.repo.find({
      where: { country },
      order: { name: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActive(): Promise<Bank[]> {
    const entities = await this.repo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(bank: Bank): Promise<Bank> {
    const entity = this.mapper.toOrmEntity(bank);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }
}
