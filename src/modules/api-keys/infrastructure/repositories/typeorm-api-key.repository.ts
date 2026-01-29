import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyRepository } from '../../domain/repositories/api-key.repository';
import { ApiKey } from '../../domain/entities/api-key.entity';
import { ApiKeyOrmEntity } from '../orm-entities/api-key.orm-entity';

@Injectable()
export class TypeOrmApiKeyRepository extends ApiKeyRepository {
  constructor(
    @InjectRepository(ApiKeyOrmEntity)
    private readonly repo: Repository<ApiKeyOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<ApiKey | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const entity = await this.repo.findOne({ where: { keyHash } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByKeyPrefix(keyPrefix: string): Promise<ApiKey[]> {
    const entities = await this.repo.find({ where: { keyPrefix } });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findAllActive(): Promise<ApiKey[]> {
    const entities = await this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(apiKey: ApiKey): Promise<ApiKey> {
    const entity = this.toOrmEntity(apiKey);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: ApiKeyOrmEntity): ApiKey {
    return ApiKey.fromPersistence({
      id: entity.id,
      name: entity.name,
      keyHash: entity.keyHash,
      keyPrefix: entity.keyPrefix,
      permissions: entity.permissions,
      rateLimit: entity.rateLimit,
      userId: entity.userId,
      isActive: entity.isActive,
      expiresAt: entity.expiresAt,
      lastUsedAt: entity.lastUsedAt,
      usageCount: entity.usageCount,
      ipWhitelist: entity.ipWhitelist,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOrmEntity(apiKey: ApiKey): ApiKeyOrmEntity {
    const entity = new ApiKeyOrmEntity();
    entity.id = apiKey.id;
    entity.name = apiKey.name;
    entity.keyHash = apiKey.keyHash;
    entity.keyPrefix = apiKey.keyPrefix;
    entity.permissions = apiKey.permissions;
    entity.rateLimit = apiKey.rateLimit;
    entity.userId = apiKey.userId;
    entity.isActive = apiKey.isActive;
    entity.expiresAt = apiKey.expiresAt;
    entity.lastUsedAt = apiKey.lastUsedAt;
    entity.usageCount = apiKey.usageCount;
    entity.ipWhitelist = apiKey.ipWhitelist;
    return entity;
  }
}
