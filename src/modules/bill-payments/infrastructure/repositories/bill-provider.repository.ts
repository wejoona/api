import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillProviderOrmEntity } from '../orm-entities';
import {
  BillProvider,
  BillCategory,
  SupportedCountry,
  GetProvidersQuery,
} from '../../domain/types';

@Injectable()
export class BillProviderRepository {
  constructor(
    @InjectRepository(BillProviderOrmEntity)
    private readonly repository: Repository<BillProviderOrmEntity>,
  ) {}

  async findAll(query: GetProvidersQuery = {}): Promise<BillProvider[]> {
    const qb = this.repository.createQueryBuilder('provider');

    if (query.country) {
      qb.andWhere('provider.country = :country', { country: query.country });
    }

    if (query.category) {
      qb.andWhere('provider.category = :category', {
        category: query.category,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('provider.isActive = :isActive', {
        isActive: query.isActive,
      });
    } else {
      // Default to active providers only
      qb.andWhere('provider.isActive = true');
    }

    qb.orderBy('provider.priority', 'DESC').addOrderBy('provider.name', 'ASC');

    const entities = await qb.getMany();
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<BillProvider | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByIdWithConfig(id: string): Promise<{
    provider: BillProvider;
    adapterType: string;
    adapterConfig: Record<string, unknown> | null;
  } | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;

    return {
      provider: this.toDomain(entity),
      adapterType: entity.adapterType,
      adapterConfig: entity.adapterConfig,
    };
  }

  async findByCategory(
    category: BillCategory,
    country?: SupportedCountry,
  ): Promise<BillProvider[]> {
    const query: GetProvidersQuery = { category, isActive: true };
    if (country) {
      query.country = country;
    }
    return this.findAll(query);
  }

  async findByCountry(country: SupportedCountry): Promise<BillProvider[]> {
    return this.findAll({ country, isActive: true });
  }

  async getCategories(country?: SupportedCountry): Promise<BillCategory[]> {
    const qb = this.repository
      .createQueryBuilder('provider')
      .select('DISTINCT provider.category', 'category')
      .where('provider.isActive = true');

    if (country) {
      qb.andWhere('provider.country = :country', { country });
    }

    const results = await qb.getRawMany();
    return results.map((r) => r.category as BillCategory);
  }

  async getCountries(): Promise<SupportedCountry[]> {
    const results = await this.repository
      .createQueryBuilder('provider')
      .select('DISTINCT provider.country', 'country')
      .where('provider.isActive = true')
      .getRawMany();

    return results.map((r) => r.country as SupportedCountry);
  }

  async create(
    provider: Partial<BillProviderOrmEntity>,
  ): Promise<BillProvider> {
    const entity = this.repository.create(provider);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(
    id: string,
    data: Partial<BillProviderOrmEntity>,
  ): Promise<BillProvider | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.repository.update(id, { isActive });
  }

  private toDomain(entity: BillProviderOrmEntity): BillProvider {
    return {
      id: entity.id,
      name: entity.name,
      shortName: entity.shortName,
      category: entity.category,
      country: entity.country,
      logo: entity.logo || '',
      requiresAccountNumber: entity.requiresAccountNumber,
      requiresMeterNumber: entity.requiresMeterNumber,
      requiresCustomerName: entity.requiresCustomerName,
      accountNumberLabel: entity.accountNumberLabel,
      accountNumberPattern: entity.accountNumberPattern || undefined,
      accountNumberLength: entity.accountNumberLength || undefined,
      minimumAmount: Number(entity.minimumAmount),
      maximumAmount: Number(entity.maximumAmount),
      processingFee: Number(entity.processingFee),
      processingFeeType: entity.processingFeeType,
      currency: entity.currency,
      isActive: entity.isActive,
      supportsValidation: entity.supportsValidation,
      estimatedProcessingTime: entity.estimatedProcessingTime,
      operatingHours: entity.operatingHours || undefined,
      metadata: entity.metadata || undefined,
    };
  }
}
