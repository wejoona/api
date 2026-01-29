import { v4 as uuidv4 } from 'uuid';

/**
 * Rule types for velocity/limit rules
 */
export enum VelocityRuleType {
  DAILY_LIMIT = 'daily_limit',
  WEEKLY_LIMIT = 'weekly_limit',
  MONTHLY_LIMIT = 'monthly_limit',
  TRANSACTION_COUNT = 'transaction_count',
  VELOCITY = 'velocity',
}

/**
 * Actions to take when a rule is triggered
 */
export enum VelocityRuleAction {
  BLOCK = 'block',
  FLAG = 'flag',
  REQUIRE_REVIEW = 'require_review',
}

/**
 * User KYC tiers for rule applicability
 */
export type UserTier = 'unverified' | 'basic' | 'verified' | 'premium';

export interface VelocityRuleProps {
  id?: string;
  name!: string;
  description?: string;
  ruleType!: VelocityRuleType;
  thresholdAmount?: number;
  thresholdCount?: number;
  timeWindowHours!: number;
  action!: VelocityRuleAction;
  appliesToTier!: UserTier[];
  isActive!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Velocity Rule Domain Entity
 *
 * Defines transaction speed and volume limits for compliance.
 * Rules are applied based on user KYC tier and can trigger different actions.
 */
export class VelocityRule {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly ruleType: VelocityRuleType;
  readonly thresholdAmount: number | null;
  readonly thresholdCount: number | null;
  readonly timeWindowHours: number;
  readonly action: VelocityRuleAction;
  readonly appliesToTier: UserTier[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: VelocityRuleProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.description = props.description || null;
    this.ruleType = props.ruleType;
    this.thresholdAmount = props.thresholdAmount ?? null;
    this.thresholdCount = props.thresholdCount ?? null;
    this.timeWindowHours = props.timeWindowHours;
    this.action = props.action;
    this.appliesToTier = props.appliesToTier;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  /**
   * Create a new velocity rule
   */
  static create(
    props!: Omit<VelocityRuleProps, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>,
  ): VelocityRule {
    return new VelocityRule({
      ...props,
      isActive!: true,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: VelocityRuleProps): VelocityRule {
    return new VelocityRule(props);
  }

  /**
   * Check if this rule applies to a given user tier
   */
  appliesToUserTier(tier: UserTier): boolean {
    return this.appliesToTier.includes(tier);
  }

  /**
   * Check if a transaction amount exceeds the threshold
   */
  exceedsAmountThreshold(amount: number): boolean {
    if (this.thresholdAmount === null) {
      return false;
    }
    return amount > this.thresholdAmount;
  }

  /**
   * Check if a transaction count exceeds the threshold
   */
  exceedsCountThreshold(count: number): boolean {
    if (this.thresholdCount === null) {
      return false;
    }
    return count > this.thresholdCount;
  }

  /**
   * Get the time window in milliseconds
   */
  getTimeWindowMs(): number {
    return this.timeWindowHours * 60 * 60 * 1000;
  }

  /**
   * Determine if the action should block the transaction
   */
  shouldBlock(): boolean {
    return this.action === VelocityRuleAction.BLOCK;
  }
}
