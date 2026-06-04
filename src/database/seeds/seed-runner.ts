import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

// Import seed functions
import { seedFeatureFlags } from './01-feature-flags.seed';
import { seedSlaConfigurations } from './02-sla-configurations.seed';
import { seedVelocityRules } from './03-velocity-rules.seed';
import { seedAdminUsers } from './04-admin-users.seed';
import { seedSystemSettings } from './05-system-settings.seed';
import { seedDemoData } from './06-demo-data.seed';

/**
 * Seed Runner
 *
 * Executes database seeds in the correct order.
 * Seeds are idempotent - they skip records that already exist.
 *
 * Usage:
 *   npm run seed:prod     - Run production seeds only
 *   npm run seed:staging  - Run production + demo data
 *   npm run seed:demo     - Run demo data only (for existing DB)
 *
 * Environment Variables:
 *   SEED_MODE: 'production' | 'staging' | 'demo'
 */

type SeedMode = 'production' | 'staging' | 'demo';

interface SeedConfig {
  name: string;
  fn: (dataSource: DataSource) => Promise<void>;
  environments: SeedMode[];
}

// Define seeds in execution order
const seeds: SeedConfig[] = [
  {
    name: 'Feature Flags',
    fn: seedFeatureFlags,
    environments: ['production', 'staging'],
  },
  {
    name: 'SLA Configurations',
    fn: seedSlaConfigurations,
    environments: ['production', 'staging'],
  },
  {
    name: 'Velocity Rules',
    fn: seedVelocityRules,
    environments: ['production', 'staging'],
  },
  {
    name: 'Admin Users',
    fn: seedAdminUsers,
    environments: ['production', 'staging'],
  },
  {
    name: 'System Settings',
    fn: seedSystemSettings,
    environments: ['production', 'staging'],
  },
  {
    name: 'Demo Data',
    fn: seedDemoData,
    environments: ['staging', 'demo'],
  },
];

const productionAdminPinEnvNames = [
  'SEED_ADMIN_PIN_SUPERADMIN',
  'SEED_ADMIN_PIN_COMPLIANCE',
  'SEED_ADMIN_PIN_SUPPORT',
  'SEED_ADMIN_PIN_FINANCE',
];

function validateProductionSeedConfig(mode: SeedMode): void {
  if (mode !== 'production' && process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing = productionAdminPinEnvNames.filter((envName) => {
    const value = process.env[envName];
    return !value || !/^\d{6}$/.test(value);
  });

  if (missing.length > 0) {
    throw new Error(
      `Production seeding requires explicit 6-digit admin PIN env vars: ${missing.join(', ')}`,
    );
  }
}

async function runSeeds(mode: SeedMode): Promise<void> {
  console.log('='.repeat(60));
  console.log(`JoonaPay Database Seeder`);
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
  console.log();

  // Safety check for demo data in production
  if (mode === 'demo' && process.env.NODE_ENV === 'production') {
    console.error('ERROR: Cannot run demo seed in production environment!');
    process.exit(1);
  }

  validateProductionSeedConfig(mode);

  // Initialize data source
  const dataSource = new DataSource(dataSourceOptions);

  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('Database connected.\n');

    // Filter seeds based on mode
    const seedsToRun = seeds.filter((seed) => seed.environments.includes(mode));

    console.log(`Seeds to run: ${seedsToRun.length}`);
    console.log('-'.repeat(60));
    console.log();

    // Execute seeds in order
    for (let i = 0; i < seedsToRun.length; i++) {
      const seed = seedsToRun[i];
      console.log(`[${i + 1}/${seedsToRun.length}] Running: ${seed.name}`);
      console.log('-'.repeat(40));

      const startTime = Date.now();
      try {
        await seed.fn(dataSource);
        const duration = Date.now() - startTime;
        console.log(`Completed in ${duration}ms\n`);
      } catch (error) {
        console.error(`FAILED: ${seed.name}`);
        console.error(error);
        throw error;
      }
    }

    console.log('='.repeat(60));
    console.log('All seeds completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nSeeding failed!');
    console.error(error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Parse command line arguments
function getMode(): SeedMode {
  const args = process.argv.slice(2);
  const modeArg = args.find((arg) => arg.startsWith('--mode='));

  if (modeArg) {
    const mode = modeArg.split('=')[1] as SeedMode;
    if (['production', 'staging', 'demo'].includes(mode)) {
      return mode;
    }
  }

  // Check environment variable
  const envMode = process.env.SEED_MODE as SeedMode;
  if (envMode && ['production', 'staging', 'demo'].includes(envMode)) {
    return envMode;
  }

  // Default based on NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    return 'production';
  }

  return 'staging';
}

// Run if executed directly
const mode = getMode();
runSeeds(mode);

export { runSeeds, SeedMode };
