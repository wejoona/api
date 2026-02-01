import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { Business } from '../../domain/entities/business.entity';
import { BusinessOrmEntity } from '../orm-entities/business.orm-entity';
import { BusinessMapper } from '../mappers/business.mapper';

@Injectable()
export class TypeOrmBusinessRepository extends BusinessRepository {
  constructor(
    @InjectRepository(BusinessOrmEntity)
    private readonly repo: Repository<BusinessOrmEntity>,
    private readonly mapper: BusinessMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<Business | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Business | null> {
    const entity = await this.repo.findOne({ where: { userId } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<Business | null> {
    const entity = await this.repo.findOne({ where: { registrationNumber } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(business: Business): Promise<Business> {
    const entity = this.mapper.toOrmEntity(business);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
