import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiKeyRepository } from '../../domain/repositories/api-key.repository';
import { ApiKey } from '../../domain/entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';

export interface ApiKeyValidationResult {
  apiKey: ApiKey;
  valid: boolean;
  error?: string;
}

@Injectable()
export class ApiKeyService {
  private static readonly KEY_PREFIX = 'jpk_'; // JoonaPay Key prefix
  private static readonly KEY_LENGTH = 32; // 32 bytes = 64 hex chars

  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  /**
   * Generate a new API key for a user or system
   */
  async createApiKey(
    dto: CreateApiKeyDto,
    userId?: string,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    // Generate raw key
    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    // Check for hash collision (extremely unlikely but good practice)
    const existing = await this.apiKeyRepository.findByKeyHash(keyHash);
    if (existing) {
      throw new ConflictException('Key generation collision, please retry');
    }

    const apiKey = ApiKey.create({
      name: dto.name,
      keyHash,
      keyPrefix,
      permissions: dto.permissions,
      rateLimit: dto.rateLimit,
      userId: userId || null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      ipWhitelist: dto.ipWhitelist || null,
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    return { apiKey: saved, rawKey };
  }

  /**
   * Validate an API key and return the associated key entity
   */
  async validateApiKey(rawKey: string, clientIp?: string): Promise<ApiKey> {
    if (!rawKey || !rawKey.startsWith(ApiKeyService.KEY_PREFIX)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Minimum key length check to reject obviously bogus keys early
    if (rawKey.length < ApiKeyService.KEY_PREFIX.length + 16) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key is deactivated');
    }

    if (apiKey.isExpired()) {
      // Auto-deactivate expired keys
      const deactivated = apiKey.withDeactivated();
      await this.apiKeyRepository.save(deactivated);
      throw new UnauthorizedException('API key has expired');
    }

    if (clientIp && !apiKey.isIpAllowed(clientIp)) {
      throw new ForbiddenException(
        'IP address not whitelisted for this API key',
      );
    }

    // Update usage statistics
    const updatedKey = apiKey.withUpdatedUsage();
    await this.apiKeyRepository.save(updatedKey);

    return updatedKey;
  }

  /**
   * Check if API key has required permission
   */
  async checkPermission(rawKey: string, permission: string): Promise<ApiKey> {
    const apiKey = await this.validateApiKey(rawKey);

    if (!apiKey.hasPermission(permission)) {
      throw new ForbiddenException(
        `API key does not have required permission: ${permission}`,
      );
    }

    return apiKey;
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(id: string, userId?: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findById(id);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // If userId provided, ensure the key belongs to that user
    if (userId && apiKey.userId !== userId) {
      throw new ForbiddenException('Access denied to this API key');
    }

    return apiKey;
  }

  /**
   * Get all API keys for a user
   */
  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.findByUserId(userId);
  }

  /**
   * Get all active API keys (admin only)
   */
  async getAllActiveApiKeys(): Promise<ApiKey[]> {
    return this.apiKeyRepository.findAllActive();
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    id: string,
    dto: UpdateApiKeyDto,
    userId?: string,
  ): Promise<ApiKey> {
    const apiKey = await this.getApiKeyById(id, userId);

    const updatedKey = ApiKey.fromPersistence({
      id: apiKey.id,
      name: dto.name ?? apiKey.name,
      keyHash: apiKey.keyHash,
      keyPrefix: apiKey.keyPrefix,
      permissions: dto.permissions ?? apiKey.permissions,
      rateLimit: dto.rateLimit ?? apiKey.rateLimit,
      userId: apiKey.userId,
      isActive: dto.isActive ?? apiKey.isActive,
      expiresAt:
        dto.expiresAt !== undefined
          ? dto.expiresAt
            ? new Date(dto.expiresAt)
            : null
          : apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      usageCount: apiKey.usageCount,
      ipWhitelist:
        dto.ipWhitelist !== undefined ? dto.ipWhitelist : apiKey.ipWhitelist,
      createdAt: apiKey.createdAt,
      updatedAt: new Date(),
    });

    return this.apiKeyRepository.save(updatedKey);
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(id: string, userId?: string): Promise<ApiKey> {
    const apiKey = await this.getApiKeyById(id, userId);
    const revokedKey = apiKey.withDeactivated();
    return this.apiKeyRepository.save(revokedKey);
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(id: string, userId?: string): Promise<void> {
    await this.getApiKeyById(id, userId); // Validates existence and access
    await this.apiKeyRepository.delete(id);
  }

  /**
   * Regenerate an API key (creates new key, preserves settings)
   */
  async regenerateApiKey(
    id: string,
    userId?: string,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const existingKey = await this.getApiKeyById(id, userId);

    // Generate new key
    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    // Create new key with same settings
    const newKey = ApiKey.fromPersistence({
      id: existingKey.id,
      name: existingKey.name,
      keyHash,
      keyPrefix,
      permissions: existingKey.permissions,
      rateLimit: existingKey.rateLimit,
      userId: existingKey.userId,
      isActive: true,
      expiresAt: existingKey.expiresAt,
      lastUsedAt: null,
      usageCount: 0,
      ipWhitelist: existingKey.ipWhitelist,
      createdAt: existingKey.createdAt,
      updatedAt: new Date(),
    });

    const saved = await this.apiKeyRepository.save(newKey);

    return { apiKey: saved, rawKey };
  }

  /**
   * Generate a cryptographically secure raw API key
   */
  private generateRawKey(): string {
    const randomPart = randomBytes(ApiKeyService.KEY_LENGTH).toString('hex');
    return `${ApiKeyService.KEY_PREFIX}${randomPart}`;
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
