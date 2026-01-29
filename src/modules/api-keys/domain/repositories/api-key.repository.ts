import { ApiKey } from '../entities/api-key.entity';

export abstract class ApiKeyRepository {
  abstract findById(id: string): Promise<ApiKey | null>;
  abstract findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  abstract findByKeyPrefix(keyPrefix: string): Promise<ApiKey[]>;
  abstract findByUserId(userId: string): Promise<ApiKey[]>;
  abstract findAllActive(): Promise<ApiKey[]>;
  abstract save(apiKey: ApiKey): Promise<ApiKey>;
  abstract delete(id: string): Promise<void>;
}
