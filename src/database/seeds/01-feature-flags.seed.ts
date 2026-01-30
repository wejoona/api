import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Feature Flags Seed
 *
 * Seeds all production-ready feature flags with default states.
 * These control feature rollouts across the JoonaPay mobile app.
 */

interface FeatureFlagSeedData {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  enabledCountries: string[];
  platforms: string[];
  metadata?: Record<string, unknown>;
}

const featureFlags: FeatureFlagSeedData[] = [
  // Core Features
  {
    key: 'mobile_money_deposits',
    name: 'Mobile Money Deposits',
    description: 'Enable deposits via Orange Money, MTN MoMo, and Wave',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: ['CI', 'SN', 'ML', 'BF', 'TG', 'BJ', 'GN', 'NE'],
    platforms: ['ios', 'android'],
  },
  {
    key: 'mobile_money_withdrawals',
    name: 'Mobile Money Withdrawals',
    description: 'Enable withdrawals to Orange Money, MTN MoMo, and Wave',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: ['CI', 'SN', 'ML', 'BF', 'TG', 'BJ', 'GN', 'NE'],
    platforms: ['ios', 'android'],
  },
  {
    key: 'p2p_transfers',
    name: 'P2P Transfers',
    description: 'Enable peer-to-peer USDC transfers between JoonaPay users',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'external_usdc_transfers',
    name: 'External USDC Transfers',
    description: 'Enable transfers to external USDC wallet addresses',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'bank_transfers',
    name: 'Bank Transfers',
    description: 'Enable bank account deposits and withdrawals',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: ['CI', 'SN'],
    platforms: ['ios', 'android'],
    metadata: { launchDate: '2024-Q2' },
  },

  // KYC Features
  {
    key: 'kyc_selfie_verification',
    name: 'KYC Selfie Verification',
    description: 'Require selfie match during KYC verification',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'kyc_auto_approval',
    name: 'KYC Auto Approval',
    description: 'Enable automatic KYC approval for low-risk profiles',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: [],
  },
  {
    key: 'enhanced_kyc_tier',
    name: 'Enhanced KYC Tier',
    description: 'Enable premium KYC tier with higher limits',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: ['CI', 'SN'],
    platforms: ['ios', 'android'],
  },

  // Security Features
  {
    key: 'biometric_auth',
    name: 'Biometric Authentication',
    description: 'Enable Face ID and fingerprint authentication',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'device_binding',
    name: 'Device Binding',
    description: 'Bind user account to specific devices for security',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'transaction_pin',
    name: 'Transaction PIN',
    description: 'Require PIN for all transactions',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'sms_otp_verification',
    name: 'SMS OTP Verification',
    description: 'Enable SMS OTP for sensitive operations',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'sanctions_screening',
    name: 'Sanctions Screening',
    description: 'Enable real-time sanctions and PEP screening',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: [],
  },

  // User Experience Features
  {
    key: 'dark_mode',
    name: 'Dark Mode',
    description: 'Enable dark mode theme option',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'push_notifications',
    name: 'Push Notifications',
    description: 'Enable transaction and promotional push notifications',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'in_app_chat_support',
    name: 'In-App Chat Support',
    description: 'Enable live chat support within the app',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'transaction_receipts',
    name: 'Transaction Receipts',
    description: 'Enable downloadable PDF transaction receipts',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'qr_code_payments',
    name: 'QR Code Payments',
    description: 'Enable QR code scanning for payments',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },

  // Business Features
  {
    key: 'recurring_transfers',
    name: 'Recurring Transfers',
    description: 'Enable scheduled recurring transfers',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'savings_pots',
    name: 'Savings Pots',
    description: 'Enable savings goals and pots feature',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'bill_payments',
    name: 'Bill Payments',
    description: 'Enable utility and service bill payments',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: ['CI'],
    platforms: ['ios', 'android'],
    metadata: { launchDate: '2024-Q3' },
  },
  {
    key: 'merchant_payments',
    name: 'Merchant Payments',
    description: 'Enable payments to registered merchants',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: [],
    platforms: ['ios', 'android'],
    metadata: { launchDate: '2024-Q3' },
  },
  {
    key: 'referral_program',
    name: 'Referral Program',
    description: 'Enable user referral rewards program',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },
  {
    key: 'payment_links',
    name: 'Payment Links',
    description: 'Enable shareable payment request links',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: ['ios', 'android'],
  },

  // Compliance Features
  {
    key: 'velocity_limits',
    name: 'Velocity Limits',
    description: 'Enable transaction velocity limit enforcement',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: [],
  },
  {
    key: 'aml_monitoring',
    name: 'AML Monitoring',
    description: 'Enable automated AML transaction monitoring',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: [],
  },
  {
    key: 'fraud_detection',
    name: 'Fraud Detection',
    description: 'Enable real-time fraud detection and prevention',
    isEnabled: true,
    rolloutPercentage: 100,
    enabledCountries: [],
    platforms: [],
  },

  // Experimental/Beta Features
  {
    key: 'beta_new_home_screen',
    name: 'Beta: New Home Screen',
    description: 'New redesigned home screen layout',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: [],
    platforms: ['ios', 'android'],
    metadata: { betaGroup: 'internal' },
  },
  {
    key: 'beta_crypto_prices',
    name: 'Beta: Crypto Prices Widget',
    description: 'Display live crypto prices on dashboard',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: [],
    platforms: ['ios', 'android'],
    metadata: { betaGroup: 'internal' },
  },

  // Maintenance Flags
  {
    key: 'maintenance_mode',
    name: 'Maintenance Mode',
    description: 'Enable app-wide maintenance mode',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: [],
    platforms: ['ios', 'android'],
    metadata: { showMessage: true },
  },
  {
    key: 'deposits_disabled',
    name: 'Deposits Disabled',
    description: 'Temporarily disable all deposits',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: [],
    platforms: [],
  },
  {
    key: 'withdrawals_disabled',
    name: 'Withdrawals Disabled',
    description: 'Temporarily disable all withdrawals',
    isEnabled: false,
    rolloutPercentage: 0,
    enabledCountries: [],
    platforms: [],
  },
];

export async function seedFeatureFlags(dataSource: DataSource): Promise<void> {
  console.log('Seeding feature flags...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Ensure schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS system`);

    for (const flag of featureFlags) {
      // Check if flag already exists
      const existing = await queryRunner.query(
        `SELECT id FROM system.feature_flags WHERE key = $1`,
        [flag.key],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO system.feature_flags (
            id, key, name, description, is_enabled, rollout_percentage,
            enabled_user_ids, disabled_user_ids, enabled_countries,
            platforms, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            uuidv4(),
            flag.key,
            flag.name,
            flag.description,
            flag.isEnabled,
            flag.rolloutPercentage,
            [],
            [],
            flag.enabledCountries,
            flag.platforms,
            flag.metadata ? JSON.stringify(flag.metadata) : null,
          ],
        );
        console.log(`  Created feature flag: ${flag.key}`);
      } else {
        console.log(`  Skipped (exists): ${flag.key}`);
      }
    }

    await queryRunner.commitTransaction();
    console.log(`Feature flags seeded: ${featureFlags.length} flags processed`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Failed to seed feature flags:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedFeatureFlags;
