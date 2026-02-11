import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvRequirement {
  key: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  { key: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { key: 'REDIS_URL', required: false, defaultValue: 'redis://localhost:6379', description: 'Redis connection' },
  { key: 'JWT_SECRET', required: true, description: 'JWT signing secret' },
  { key: 'JWT_EXPIRY', required: false, defaultValue: '15m', description: 'JWT token expiry' },
  { key: 'BLNK_API_URL', required: false, defaultValue: 'http://localhost:5001', description: 'Blnk ledger URL' },
  { key: 'CIRCLE_API_KEY', required: false, description: 'Circle API key (mainnet)' },
  { key: 'STELLAR_OMNIBUS_ADDRESS', required: false, description: 'Stellar omnibus public key' },
  { key: 'OTP_USE_DEV', required: false, defaultValue: 'true', description: 'Use dev OTP (123456)' },
  { key: 'VERIFYHQ_API_KEY', required: false, description: 'VerifyHQ API key' },
  { key: 'NODE_ENV', required: false, defaultValue: 'development', description: 'Environment' },
];

/** Validate required environment variables on startup */
export function validateEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const req of ENV_REQUIREMENTS) {
    const value = process.env[req.key];
    if (!value && req.required) {
      missing.push(`${req.key} (${req.description})`);
    } else if (!value && !req.required && req.defaultValue) {
      warnings.push(`${req.key} not set, using default: ${req.defaultValue}`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(w));
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables:\n${missing.map((m) => `  - ${m}`).join('\n')}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  logger.log('Environment validation complete');
}
