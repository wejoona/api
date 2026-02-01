import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * System Settings Seed
 *
 * Seeds application configuration and provider settings templates.
 * Settings are organized by category for easy management.
 *
 * Categories:
 * - app: General application settings
 * - provider: Payment provider configurations
 * - security: Security and authentication settings
 * - notification: Notification settings
 * - compliance: Compliance and limits settings
 * - localization: Regional and language settings
 */

interface SystemSettingSeedData {
  key: string;
  value: string | number | boolean | object;
  category: string;
  description: string;
  isEncrypted: boolean;
  isEditable: boolean;
}

const systemSettings: SystemSettingSeedData[] = [
  // ===================
  // APP SETTINGS
  // ===================
  {
    key: 'app.name',
    value: 'JoonaPay',
    category: 'app',
    description: 'Application display name',
    isEncrypted: false,
    isEditable: false,
  },
  {
    key: 'app.version.minimum_ios',
    value: '1.0.0',
    category: 'app',
    description: 'Minimum required iOS app version',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.version.minimum_android',
    value: '1.0.0',
    category: 'app',
    description: 'Minimum required Android app version',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.version.latest_ios',
    value: '1.0.0',
    category: 'app',
    description: 'Latest available iOS app version',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.version.latest_android',
    value: '1.0.0',
    category: 'app',
    description: 'Latest available Android app version',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.maintenance_mode',
    value: false,
    category: 'app',
    description: 'Enable/disable maintenance mode',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.maintenance_message',
    value:
      'We are currently performing scheduled maintenance. Please try again later.',
    category: 'app',
    description: 'Message shown during maintenance mode',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.support_email',
    value: 'support@joonapay.com',
    category: 'app',
    description: 'Customer support email address',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.support_phone',
    value: '+225 XX XX XX XX',
    category: 'app',
    description: 'Customer support phone number',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.terms_url',
    value: 'https://joonapay.com/terms',
    category: 'app',
    description: 'Terms of service URL',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'app.privacy_url',
    value: 'https://joonapay.com/privacy',
    category: 'app',
    description: 'Privacy policy URL',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // PROVIDER SETTINGS (Templates - actual keys stored in env/secrets)
  // ===================
  {
    key: 'provider.yellow_card.enabled',
    value: true,
    category: 'provider',
    description: 'Enable Yellow Card provider for mobile money',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.yellow_card.supported_countries',
    value: ['CI', 'SN', 'ML', 'BF', 'TG', 'BJ', 'GN', 'NE'],
    category: 'provider',
    description: 'Countries supported by Yellow Card',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.yellow_card.min_deposit',
    value: 1,
    category: 'provider',
    description: 'Minimum deposit amount in USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.yellow_card.max_deposit',
    value: 10000,
    category: 'provider',
    description: 'Maximum deposit amount in USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.yellow_card.deposit_fee_percent',
    value: 1.5,
    category: 'provider',
    description: 'Yellow Card deposit fee percentage',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.yellow_card.withdrawal_fee_percent',
    value: 1.0,
    category: 'provider',
    description: 'Yellow Card withdrawal fee percentage',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.circle.enabled',
    value: true,
    category: 'provider',
    description: 'Enable Circle provider for USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.circle.supported_networks',
    value: ['POLYGON', 'ETH', 'SOL'],
    category: 'provider',
    description: 'Blockchain networks supported for USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.circle.default_network',
    value: 'POLYGON',
    category: 'provider',
    description: 'Default network for external USDC transfers',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.blnk.enabled',
    value: true,
    category: 'provider',
    description: 'Enable Blnk ledger provider',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // MOBILE MONEY PROVIDERS
  // ===================
  {
    key: 'provider.mobile_money.orange_money.enabled',
    value: true,
    category: 'provider',
    description: 'Enable Orange Money',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.mobile_money.orange_money.countries',
    value: ['CI', 'SN', 'ML', 'BF'],
    category: 'provider',
    description: 'Countries with Orange Money support',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.mobile_money.mtn_momo.enabled',
    value: true,
    category: 'provider',
    description: 'Enable MTN MoMo',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.mobile_money.mtn_momo.countries',
    value: ['CI', 'GH', 'UG', 'RW'],
    category: 'provider',
    description: 'Countries with MTN MoMo support',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.mobile_money.wave.enabled',
    value: true,
    category: 'provider',
    description: 'Enable Wave',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'provider.mobile_money.wave.countries',
    value: ['CI', 'SN', 'ML', 'BF', 'UG'],
    category: 'provider',
    description: 'Countries with Wave support',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // SECURITY SETTINGS
  // ===================
  {
    key: 'security.pin.max_attempts',
    value: 5,
    category: 'security',
    description: 'Maximum PIN entry attempts before lockout',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.pin.lockout_duration_minutes',
    value: 30,
    category: 'security',
    description: 'PIN lockout duration in minutes',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.pin.length',
    value: 6,
    category: 'security',
    description: 'Required PIN length',
    isEncrypted: false,
    isEditable: false,
  },
  {
    key: 'security.session.timeout_minutes',
    value: 15,
    category: 'security',
    description: 'Session timeout in minutes of inactivity',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.session.max_devices',
    value: 3,
    category: 'security',
    description: 'Maximum concurrent devices per user',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.otp.expiry_seconds',
    value: 300,
    category: 'security',
    description: 'OTP validity duration in seconds',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.otp.max_attempts',
    value: 3,
    category: 'security',
    description: 'Maximum OTP verification attempts',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.otp.cooldown_seconds',
    value: 60,
    category: 'security',
    description: 'Cooldown between OTP requests',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.device_binding.enabled',
    value: true,
    category: 'security',
    description: 'Require device binding for transactions',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'security.biometric.enabled',
    value: true,
    category: 'security',
    description: 'Allow biometric authentication',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // NOTIFICATION SETTINGS
  // ===================
  {
    key: 'notification.push.enabled',
    value: true,
    category: 'notification',
    description: 'Enable push notifications',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'notification.sms.enabled',
    value: true,
    category: 'notification',
    description: 'Enable SMS notifications',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'notification.email.enabled',
    value: true,
    category: 'notification',
    description: 'Enable email notifications',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'notification.transaction_alerts.enabled',
    value: true,
    category: 'notification',
    description: 'Send transaction notifications',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'notification.marketing.enabled',
    value: false,
    category: 'notification',
    description: 'Enable marketing notifications',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // COMPLIANCE SETTINGS
  // ===================
  {
    key: 'compliance.sanctions_screening.enabled',
    value: true,
    category: 'compliance',
    description: 'Enable sanctions screening',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'compliance.pep_screening.enabled',
    value: true,
    category: 'compliance',
    description: 'Enable PEP screening',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'compliance.aml_threshold_usdc',
    value: 1000,
    category: 'compliance',
    description: 'AML reporting threshold in USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'compliance.transaction_monitoring.enabled',
    value: true,
    category: 'compliance',
    description: 'Enable real-time transaction monitoring',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // LOCALIZATION SETTINGS
  // ===================
  {
    key: 'localization.default_language',
    value: 'fr',
    category: 'localization',
    description: 'Default application language',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'localization.supported_languages',
    value: ['fr', 'en'],
    category: 'localization',
    description: 'Supported application languages',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'localization.default_currency',
    value: 'XOF',
    category: 'localization',
    description: 'Default display currency for West Africa',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'localization.supported_currencies',
    value: ['XOF', 'USD', 'EUR'],
    category: 'localization',
    description: 'Supported display currencies',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'localization.timezone',
    value: 'Africa/Abidjan',
    category: 'localization',
    description: 'Default timezone (GMT)',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'localization.xof_usd_rate',
    value: 600,
    category: 'localization',
    description: 'Approximate XOF to USD exchange rate (for display)',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // BUSINESS HOURS SETTINGS
  // ===================
  {
    key: 'business.hours.start',
    value: '08:00',
    category: 'business',
    description: 'Business hours start time (local)',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'business.hours.end',
    value: '18:00',
    category: 'business',
    description: 'Business hours end time (local)',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'business.hours.days',
    value: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    category: 'business',
    description: 'Business days of the week',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'business.holidays',
    value: [],
    category: 'business',
    description: 'List of holiday dates (ISO format)',
    isEncrypted: false,
    isEditable: true,
  },

  // ===================
  // REFERRAL PROGRAM SETTINGS
  // ===================
  {
    key: 'referral.enabled',
    value: true,
    category: 'referral',
    description: 'Enable referral program',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'referral.bonus_referrer_usdc',
    value: 5,
    category: 'referral',
    description: 'Referrer bonus amount in USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'referral.bonus_referee_usdc',
    value: 5,
    category: 'referral',
    description: 'Referee bonus amount in USDC',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'referral.min_transaction_usdc',
    value: 10,
    category: 'referral',
    description: 'Minimum first transaction to qualify',
    isEncrypted: false,
    isEditable: true,
  },
  {
    key: 'referral.max_referrals_per_user',
    value: 50,
    category: 'referral',
    description: 'Maximum referrals per user',
    isEncrypted: false,
    isEditable: true,
  },
];

export async function seedSystemSettings(
  dataSource: DataSource,
): Promise<void> {
  console.log('Seeding system settings...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Ensure system schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS system`);

    // Create system_settings table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system.system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(200) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        is_encrypted BOOLEAN DEFAULT false,
        is_editable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on category
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_system_settings_category
      ON system.system_settings(category)
    `);

    for (const setting of systemSettings) {
      // Check if setting already exists
      const existing = await queryRunner.query(
        `SELECT id FROM system.system_settings WHERE key = $1`,
        [setting.key],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO system.system_settings (
            id, key, value, category, description, is_encrypted, is_editable,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            uuidv4(),
            setting.key,
            JSON.stringify(setting.value),
            setting.category,
            setting.description,
            setting.isEncrypted,
            setting.isEditable,
          ],
        );
        console.log(`  Created setting: ${setting.key}`);
      } else {
        console.log(`  Skipped (exists): ${setting.key}`);
      }
    }

    await queryRunner.commitTransaction();
    console.log(
      `System settings seeded: ${systemSettings.length} settings processed`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Failed to seed system settings:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedSystemSettings;
