import { ApiKey } from '../../domain/entities/api-key.entity';

export class ApiKeyResponseDto {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  userId: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  ipWhitelist: string[] | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(apiKey: ApiKey): ApiKeyResponseDto {
    const dto = new ApiKeyResponseDto();
    dto.id = apiKey.id;
    dto.name = apiKey.name;
    dto.keyPrefix = apiKey.keyPrefix;
    dto.permissions = apiKey.permissions;
    dto.rateLimit = apiKey.rateLimit;
    dto.userId = apiKey.userId;
    dto.isActive = apiKey.isActive;
    dto.expiresAt = apiKey.expiresAt;
    dto.lastUsedAt = apiKey.lastUsedAt;
    dto.usageCount = apiKey.usageCount;
    dto.ipWhitelist = apiKey.ipWhitelist;
    dto.createdAt = apiKey.createdAt;
    dto.updatedAt = apiKey.updatedAt;
    return dto;
  }
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  /**
   * The raw API key - only returned once on creation.
   * Store this securely as it cannot be retrieved again.
   */
  rawKey: string;

  static fromEntityWithKey(
    apiKey: ApiKey,
    rawKey: string,
  ): ApiKeyCreatedResponseDto {
    const dto = new ApiKeyCreatedResponseDto();
    Object.assign(dto, ApiKeyResponseDto.fromEntity(apiKey));
    dto.rawKey = rawKey;
    return dto;
  }
}
