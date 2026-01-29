import { RetentionPolicy } from '../entities/retention-policy.entity';

export abstract class RetentionPolicyRepository {
  abstract findAll(): Promise<RetentionPolicy[]>;
  abstract findByDataType(dataType: string): Promise<RetentionPolicy | null>;
  abstract findEnabled(): Promise<RetentionPolicy[]>;
  abstract save(policy: RetentionPolicy): Promise<RetentionPolicy>;
  abstract update(
    dataType: string,
    updates: Partial<RetentionPolicy>,
  ): Promise<void>;
}
