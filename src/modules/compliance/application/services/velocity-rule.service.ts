import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VelocityRuleRepository } from '../../domain/repositories/velocity-rule.repository';
import {
  VelocityRule,
  VelocityRuleType,
  VelocityRuleAction,
  UserTier,
} from '../../domain/entities/velocity-rule.entity';
import {
  CreateVelocityRuleDto,
  UpdateVelocityRuleDto,
  VelocityRuleResponseDto,
} from '../dto/velocity-rule.dto';

/**
 * Result of checking a transaction against velocity rules
 */
export interface VelocityCheckResult {
  allowed: boolean;
  triggeredRules: VelocityRule[];
  action: VelocityRuleAction | null;
  message: string | null;
}

/**
 * Velocity Rule Service
 *
 * Manages velocity rules for transaction limits and compliance monitoring.
 */
@Injectable()
export class VelocityRuleService {
  private readonly logger = new Logger(VelocityRuleService.name);

  constructor(
    private readonly velocityRuleRepository: VelocityRuleRepository,
  ) {}

  /**
   * Create a new velocity rule
   */
  async createRule(
    dto: CreateVelocityRuleDto,
  ): Promise<VelocityRuleResponseDto> {
    // Validate threshold requirements based on rule type
    this.validateThresholds(
      dto.ruleType,
      dto.thresholdAmount,
      dto.thresholdCount,
    );

    const rule = VelocityRule.create({
      name: dto.name,
      description: dto.description,
      ruleType: dto.ruleType,
      thresholdAmount: dto.thresholdAmount,
      thresholdCount: dto.thresholdCount,
      timeWindowHours: dto.timeWindowHours,
      action: dto.action,
      appliesToTier: dto.appliesToTier,
    });

    const saved = await this.velocityRuleRepository.save(rule);
    this.logger.log(`Created velocity rule: ${saved.id} - ${saved.name}`);

    return this.toResponseDto(saved);
  }

  /**
   * Update an existing velocity rule
   */
  async updateRule(
    id: string,
    dto: UpdateVelocityRuleDto,
  ): Promise<VelocityRuleResponseDto> {
    const existing = await this.velocityRuleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Velocity rule not found: ${id}`);
    }

    const ruleType = dto.ruleType ?? existing.ruleType;
    const thresholdAmount =
      dto.thresholdAmount ?? existing.thresholdAmount ?? undefined;
    const thresholdCount =
      dto.thresholdCount ?? existing.thresholdCount ?? undefined;

    // Validate thresholds if rule type is being changed
    if (dto.ruleType) {
      this.validateThresholds(ruleType, thresholdAmount, thresholdCount);
    }

    const updated = VelocityRule.fromPersistence({
      id: existing.id,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description ?? undefined,
      ruleType,
      thresholdAmount,
      thresholdCount,
      timeWindowHours: dto.timeWindowHours ?? existing.timeWindowHours,
      action: dto.action ?? existing.action,
      appliesToTier: dto.appliesToTier ?? existing.appliesToTier,
      isActive: dto.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    const saved = await this.velocityRuleRepository.save(updated);
    this.logger.log(`Updated velocity rule: ${saved.id}`);

    return this.toResponseDto(saved);
  }

  /**
   * Get a velocity rule by ID
   */
  async getRule(id: string): Promise<VelocityRuleResponseDto> {
    const rule = await this.velocityRuleRepository.findById(id);
    if (!rule) {
      throw new NotFoundException(`Velocity rule not found: ${id}`);
    }
    return this.toResponseDto(rule);
  }

  /**
   * Get all velocity rules
   */
  async getAllRules(activeOnly = false): Promise<VelocityRuleResponseDto[]> {
    const rules = activeOnly
      ? await this.velocityRuleRepository.findAllActive()
      : await this.velocityRuleRepository.findAll();
    return rules.map((r) => this.toResponseDto(r));
  }

  /**
   * Get rules applicable to a user tier
   */
  async getRulesForTier(tier: UserTier): Promise<VelocityRuleResponseDto[]> {
    const rules = await this.velocityRuleRepository.findActiveByTier(tier);
    return rules.map((r) => this.toResponseDto(r));
  }

  /**
   * Get rules by type
   */
  async getRulesByType(
    ruleType: VelocityRuleType,
  ): Promise<VelocityRuleResponseDto[]> {
    const rules = await this.velocityRuleRepository.findActiveByType(ruleType);
    return rules.map((r) => this.toResponseDto(r));
  }

  /**
   * Delete a velocity rule
   */
  async deleteRule(id: string): Promise<void> {
    const existing = await this.velocityRuleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Velocity rule not found: ${id}`);
    }
    await this.velocityRuleRepository.delete(id);
    this.logger.log(`Deleted velocity rule: ${id}`);
  }

  /**
   * Check a transaction against applicable velocity rules
   *
   * @param tier User's KYC tier
   * @param transactionAmount Current transaction amount
   * @param periodTotalAmount Total amount transacted in the period
   * @param periodTransactionCount Number of transactions in the period
   */
  async checkVelocity(
    tier: UserTier,
    transactionAmount: number,
    periodTotalAmount: number,
    periodTransactionCount: number,
  ): Promise<VelocityCheckResult> {
    const rules = await this.velocityRuleRepository.findActiveByTier(tier);
    const triggeredRules: VelocityRule[] = [];

    for (const rule of rules) {
      let triggered = false;

      switch (rule.ruleType) {
        case VelocityRuleType.DAILY_LIMIT:
        case VelocityRuleType.WEEKLY_LIMIT:
        case VelocityRuleType.MONTHLY_LIMIT:
          // Check if total amount exceeds threshold
          if (
            rule.thresholdAmount !== null &&
            periodTotalAmount + transactionAmount > rule.thresholdAmount
          ) {
            triggered = true;
          }
          break;

        case VelocityRuleType.TRANSACTION_COUNT:
          // Check if transaction count exceeds threshold
          if (
            rule.thresholdCount !== null &&
            periodTransactionCount + 1 > rule.thresholdCount
          ) {
            triggered = true;
          }
          break;

        case VelocityRuleType.VELOCITY:
          // Check both amount and count thresholds
          const amountExceeded =
            rule.thresholdAmount !== null &&
            periodTotalAmount + transactionAmount > rule.thresholdAmount;
          const countExceeded =
            rule.thresholdCount !== null &&
            periodTransactionCount + 1 > rule.thresholdCount;

          if (amountExceeded || countExceeded) {
            triggered = true;
          }
          break;
      }

      if (triggered) {
        triggeredRules.push(rule);
      }
    }

    if (triggeredRules.length === 0) {
      return {
        allowed: true,
        triggeredRules: [],
        action: null,
        message: null,
      };
    }

    // Determine the most restrictive action
    const hasBlock = triggeredRules.some(
      (r) => r.action === VelocityRuleAction.BLOCK,
    );
    const hasReview = triggeredRules.some(
      (r) => r.action === VelocityRuleAction.REQUIRE_REVIEW,
    );

    let action: VelocityRuleAction;
    let message: string;

    if (hasBlock) {
      action = VelocityRuleAction.BLOCK;
      message = 'Transaction blocked due to velocity limit';
    } else if (hasReview) {
      action = VelocityRuleAction.REQUIRE_REVIEW;
      message = 'Transaction requires manual review';
    } else {
      action = VelocityRuleAction.FLAG;
      message = 'Transaction flagged for monitoring';
    }

    this.logger.warn(
      `Velocity rules triggered: ${triggeredRules.map((r) => r.name).join(', ')}`,
    );

    return {
      allowed: action !== VelocityRuleAction.BLOCK,
      triggeredRules,
      action,
      message,
    };
  }

  /**
   * Validate threshold requirements based on rule type
   */
  private validateThresholds(
    ruleType: VelocityRuleType,
    thresholdAmount?: number,
    thresholdCount?: number,
  ): void {
    const amountRequired = [
      VelocityRuleType.DAILY_LIMIT,
      VelocityRuleType.WEEKLY_LIMIT,
      VelocityRuleType.MONTHLY_LIMIT,
    ].includes(ruleType);

    const countRequired = ruleType === VelocityRuleType.TRANSACTION_COUNT;

    if (
      amountRequired &&
      (thresholdAmount === undefined || thresholdAmount === null)
    ) {
      throw new BadRequestException(
        `thresholdAmount is required for ${ruleType} rule type`,
      );
    }

    if (
      countRequired &&
      (thresholdCount === undefined || thresholdCount === null)
    ) {
      throw new BadRequestException(
        `thresholdCount is required for ${ruleType} rule type`,
      );
    }

    // For velocity type, at least one threshold is required
    if (
      ruleType === VelocityRuleType.VELOCITY &&
      (thresholdAmount === undefined || thresholdAmount === null) &&
      (thresholdCount === undefined || thresholdCount === null)
    ) {
      throw new BadRequestException(
        'At least one of thresholdAmount or thresholdCount is required for velocity rule type',
      );
    }
  }

  /**
   * Map domain entity to response DTO
   */
  private toResponseDto(rule: VelocityRule): VelocityRuleResponseDto {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      thresholdAmount: rule.thresholdAmount,
      thresholdCount: rule.thresholdCount,
      timeWindowHours: rule.timeWindowHours,
      action: rule.action,
      appliesToTier: rule.appliesToTier,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
