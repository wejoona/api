import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Velocity Rules Seed
 *
 * Seeds transaction velocity/limit rules for compliance.
 *
 * West African Context (XOF - CFA Franc):
 * - 1 USD ~ 600 XOF (approximate)
 * - Minimum wage in Cote d'Ivoire: ~60,000 XOF/month
 * - Average monthly income: ~150,000-300,000 XOF
 *
 * Tier limits are progressive based on KYC level:
 * - Unverified: Very low limits (phone only)
 * - Basic: ID verified, moderate limits
 * - Verified: Full KYC, standard limits
 * - Premium: Enhanced KYC, high limits
 */

// Rule types from the velocity-rule.entity.ts
enum VelocityRuleType {
  DAILY_LIMIT = 'daily_limit',
  WEEKLY_LIMIT = 'weekly_limit',
  MONTHLY_LIMIT = 'monthly_limit',
  TRANSACTION_COUNT = 'transaction_count',
  VELOCITY = 'velocity',
}

enum VelocityRuleAction {
  BLOCK = 'block',
  FLAG = 'flag',
  REQUIRE_REVIEW = 'require_review',
}

type UserTier = 'unverified' | 'basic' | 'verified' | 'premium';

interface VelocityRuleSeedData {
  name: string;
  description: string;
  ruleType: VelocityRuleType;
  thresholdAmount: number | null;
  thresholdCount: number | null;
  timeWindowHours: number;
  action: VelocityRuleAction;
  appliesToTier: UserTier[];
}

// XOF-appropriate limits (amounts are in USDC, which will be converted to XOF in the app)
const velocityRules: VelocityRuleSeedData[] = [
  // ===================
  // UNVERIFIED TIER
  // Very restrictive - phone verification only
  // ===================
  {
    name: 'Unverified - Daily Limit',
    description:
      'Daily transaction limit for unverified users (50 USDC ~ 30,000 XOF)',
    ruleType: VelocityRuleType.DAILY_LIMIT,
    thresholdAmount: 50,
    thresholdCount: null,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['unverified'],
  },
  {
    name: 'Unverified - Weekly Limit',
    description:
      'Weekly transaction limit for unverified users (100 USDC ~ 60,000 XOF)',
    ruleType: VelocityRuleType.WEEKLY_LIMIT,
    thresholdAmount: 100,
    thresholdCount: null,
    timeWindowHours: 168,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['unverified'],
  },
  {
    name: 'Unverified - Monthly Limit',
    description:
      'Monthly transaction limit for unverified users (200 USDC ~ 120,000 XOF)',
    ruleType: VelocityRuleType.MONTHLY_LIMIT,
    thresholdAmount: 200,
    thresholdCount: null,
    timeWindowHours: 720,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['unverified'],
  },
  {
    name: 'Unverified - Daily Transaction Count',
    description: 'Maximum 3 transactions per day for unverified users',
    ruleType: VelocityRuleType.TRANSACTION_COUNT,
    thresholdAmount: null,
    thresholdCount: 3,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['unverified'],
  },

  // ===================
  // BASIC TIER
  // ID document verified
  // ===================
  {
    name: 'Basic - Daily Limit',
    description:
      'Daily transaction limit for basic users (500 USDC ~ 300,000 XOF)',
    ruleType: VelocityRuleType.DAILY_LIMIT,
    thresholdAmount: 500,
    thresholdCount: null,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['basic'],
  },
  {
    name: 'Basic - Weekly Limit',
    description:
      'Weekly transaction limit for basic users (1500 USDC ~ 900,000 XOF)',
    ruleType: VelocityRuleType.WEEKLY_LIMIT,
    thresholdAmount: 1500,
    thresholdCount: null,
    timeWindowHours: 168,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['basic'],
  },
  {
    name: 'Basic - Monthly Limit',
    description:
      'Monthly transaction limit for basic users (3000 USDC ~ 1,800,000 XOF)',
    ruleType: VelocityRuleType.MONTHLY_LIMIT,
    thresholdAmount: 3000,
    thresholdCount: null,
    timeWindowHours: 720,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['basic'],
  },
  {
    name: 'Basic - Daily Transaction Count',
    description: 'Maximum 10 transactions per day for basic users',
    ruleType: VelocityRuleType.TRANSACTION_COUNT,
    thresholdAmount: null,
    thresholdCount: 10,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['basic'],
  },

  // ===================
  // VERIFIED TIER
  // Full KYC (ID + Selfie + Address)
  // ===================
  {
    name: 'Verified - Daily Limit',
    description:
      'Daily transaction limit for verified users (2000 USDC ~ 1,200,000 XOF)',
    ruleType: VelocityRuleType.DAILY_LIMIT,
    thresholdAmount: 2000,
    thresholdCount: null,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['verified'],
  },
  {
    name: 'Verified - Weekly Limit',
    description:
      'Weekly transaction limit for verified users (7000 USDC ~ 4,200,000 XOF)',
    ruleType: VelocityRuleType.WEEKLY_LIMIT,
    thresholdAmount: 7000,
    thresholdCount: null,
    timeWindowHours: 168,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['verified'],
  },
  {
    name: 'Verified - Monthly Limit',
    description:
      'Monthly transaction limit for verified users (20000 USDC ~ 12,000,000 XOF)',
    ruleType: VelocityRuleType.MONTHLY_LIMIT,
    thresholdAmount: 20000,
    thresholdCount: null,
    timeWindowHours: 720,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['verified'],
  },
  {
    name: 'Verified - Daily Transaction Count',
    description: 'Maximum 50 transactions per day for verified users',
    ruleType: VelocityRuleType.TRANSACTION_COUNT,
    thresholdAmount: null,
    thresholdCount: 50,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['verified'],
  },

  // ===================
  // PREMIUM TIER
  // Enhanced KYC (Business/High Net Worth)
  // ===================
  {
    name: 'Premium - Daily Limit',
    description:
      'Daily transaction limit for premium users (10000 USDC ~ 6,000,000 XOF)',
    ruleType: VelocityRuleType.DAILY_LIMIT,
    thresholdAmount: 10000,
    thresholdCount: null,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['premium'],
  },
  {
    name: 'Premium - Weekly Limit',
    description:
      'Weekly transaction limit for premium users (50000 USDC ~ 30,000,000 XOF)',
    ruleType: VelocityRuleType.WEEKLY_LIMIT,
    thresholdAmount: 50000,
    thresholdCount: null,
    timeWindowHours: 168,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['premium'],
  },
  {
    name: 'Premium - Monthly Limit',
    description:
      'Monthly transaction limit for premium users (150000 USDC ~ 90,000,000 XOF)',
    ruleType: VelocityRuleType.MONTHLY_LIMIT,
    thresholdAmount: 150000,
    thresholdCount: null,
    timeWindowHours: 720,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['premium'],
  },
  {
    name: 'Premium - Daily Transaction Count',
    description: 'Maximum 200 transactions per day for premium users',
    ruleType: VelocityRuleType.TRANSACTION_COUNT,
    thresholdAmount: null,
    thresholdCount: 200,
    timeWindowHours: 24,
    action: VelocityRuleAction.BLOCK,
    appliesToTier: ['premium'],
  },

  // ===================
  // CROSS-TIER VELOCITY RULES
  // Fraud detection rules (all tiers)
  // ===================
  {
    name: 'Rapid Transactions Alert',
    description: 'Flag when more than 5 transactions occur within 1 hour',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: null,
    thresholdCount: 5,
    timeWindowHours: 1,
    action: VelocityRuleAction.FLAG,
    appliesToTier: ['unverified', 'basic', 'verified', 'premium'],
  },
  {
    name: 'Large Single Transaction - Basic',
    description:
      'Require review for single transactions over 200 USDC (basic tier)',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: 200,
    thresholdCount: null,
    timeWindowHours: 1,
    action: VelocityRuleAction.REQUIRE_REVIEW,
    appliesToTier: ['basic'],
  },
  {
    name: 'Large Single Transaction - Verified',
    description:
      'Require review for single transactions over 1000 USDC (verified tier)',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: 1000,
    thresholdCount: null,
    timeWindowHours: 1,
    action: VelocityRuleAction.REQUIRE_REVIEW,
    appliesToTier: ['verified'],
  },
  {
    name: 'Large Single Transaction - Premium',
    description:
      'Require review for single transactions over 5000 USDC (premium tier)',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: 5000,
    thresholdCount: null,
    timeWindowHours: 1,
    action: VelocityRuleAction.REQUIRE_REVIEW,
    appliesToTier: ['premium'],
  },
  {
    name: 'New Account High Activity',
    description: 'Flag new accounts with >500 USDC volume in first 24 hours',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: 500,
    thresholdCount: null,
    timeWindowHours: 24,
    action: VelocityRuleAction.FLAG,
    appliesToTier: ['unverified', 'basic'],
  },
  {
    name: 'Suspicious Pattern - Roundtripping',
    description:
      'Flag multiple deposits immediately followed by withdrawals within 2 hours',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: null,
    thresholdCount: 4,
    timeWindowHours: 2,
    action: VelocityRuleAction.FLAG,
    appliesToTier: ['unverified', 'basic', 'verified', 'premium'],
  },
  {
    name: 'Night Hours High Volume',
    description:
      'Flag high volume transactions (>1000 USDC) during night hours (23:00-06:00)',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: 1000,
    thresholdCount: null,
    timeWindowHours: 7,
    action: VelocityRuleAction.FLAG,
    appliesToTier: ['unverified', 'basic', 'verified'],
  },

  // ===================
  // WITHDRAWAL-SPECIFIC RULES
  // ===================
  {
    name: 'High Withdrawal Frequency',
    description: 'Flag more than 3 withdrawals in 1 hour',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: null,
    thresholdCount: 3,
    timeWindowHours: 1,
    action: VelocityRuleAction.FLAG,
    appliesToTier: ['unverified', 'basic', 'verified', 'premium'],
  },
  {
    name: 'Full Balance Withdrawal',
    description:
      'Require review for withdrawals that would reduce balance below 10 USDC',
    ruleType: VelocityRuleType.VELOCITY,
    thresholdAmount: 10,
    thresholdCount: null,
    timeWindowHours: 1,
    action: VelocityRuleAction.FLAG,
    appliesToTier: ['unverified', 'basic'],
  },
];

export async function seedVelocityRules(dataSource: DataSource): Promise<void> {
  console.log('Seeding velocity rules...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Ensure schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS compliance`);

    // Create enum types if they don't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE velocity_rule_type_enum AS ENUM ('daily_limit', 'weekly_limit', 'monthly_limit', 'transaction_count', 'velocity');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE velocity_rule_action_enum AS ENUM ('block', 'flag', 'require_review');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    for (const rule of velocityRules) {
      // Check if rule already exists by name
      const existing = await queryRunner.query(
        `SELECT id FROM compliance.velocity_rules WHERE name = $1`,
        [rule.name],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO compliance.velocity_rules (
            id, name, description, rule_type, threshold_amount,
            threshold_count, time_window_hours, action, applies_to_tier,
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            uuidv4(),
            rule.name,
            rule.description,
            rule.ruleType,
            rule.thresholdAmount,
            rule.thresholdCount,
            rule.timeWindowHours,
            rule.action,
            rule.appliesToTier,
            true,
          ],
        );
        console.log(`  Created velocity rule: ${rule.name}`);
      } else {
        console.log(`  Skipped (exists): ${rule.name}`);
      }
    }

    await queryRunner.commitTransaction();
    console.log(
      `Velocity rules seeded: ${velocityRules.length} rules processed`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Failed to seed velocity rules:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedVelocityRules;
