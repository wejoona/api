import { VelocityRule, VelocityRuleType, UserTier } from '../entities/velocity-rule.entity';

/**
 * Velocity Rule Repository Interface
 *
 * Abstract repository for velocity rule persistence operations.
 */
export abstract class VelocityRuleRepository {
  /**
   * Find a rule by its ID
   */
  abstract findById(id: string): Promise<VelocityRule | null>;

  /**
   * Find all active rules
   */
  abstract findAllActive(): Promise<VelocityRule[]>;

  /**
   * Find active rules applicable to a specific user tier
   */
  abstract findActiveByTier(tier: UserTier): Promise<VelocityRule[]>;

  /**
   * Find active rules by rule type
   */
  abstract findActiveByType(ruleType: VelocityRuleType): Promise<VelocityRule[]>;

  /**
   * Find active rules by tier and type
   */
  abstract findActiveByTierAndType(
    tier!: UserTier,
    ruleType: VelocityRuleType,
  ): Promise<VelocityRule[]>;

  /**
   * Find all rules (including inactive)
   */
  abstract findAll(): Promise<VelocityRule[]>;

  /**
   * Save a velocity rule (create or update)
   */
  abstract save(rule: VelocityRule): Promise<VelocityRule>;

  /**
   * Delete a velocity rule by ID
   */
  abstract delete(id: string): Promise<void>;
}
