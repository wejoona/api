/**
 * Environment Configuration Loader
 *
 * Automatically loads the appropriate configuration based on NODE_ENV.
 */

import { developmentConfig } from './development.config';
import { stagingConfig } from './staging.config';
import { productionConfig } from './production.config';

export type EnvironmentConfig =
  | typeof developmentConfig
  | typeof stagingConfig
  | typeof productionConfig;

export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  switch (nodeEnv) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const requiredVars = [
    'DATABASE_HOST',
    'DATABASE_NAME',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'REDIS_HOST',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CIRCLE_API_KEY',
    'CIRCLE_ENTITY_SECRET',
    'YELLOW_CARD_API_KEY',
    'YELLOW_CARD_SECRET_KEY',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for production: ${missingVars.join(', ')}`,
    );
  }

  // Validate JWT secrets are strong enough
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';
  if (jwtRefreshSecret.length < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET must be at least 32 characters in production',
    );
  }

  // Ensure mock modes are disabled
  if (process.env.CIRCLE_USE_MOCK === 'true') {
    throw new Error('CIRCLE_USE_MOCK must be false in production');
  }

  if (process.env.YELLOW_CARD_USE_MOCK === 'true') {
    throw new Error('YELLOW_CARD_USE_MOCK must be false in production');
  }

  if (process.env.SMS_PROVIDER === 'mock') {
    throw new Error('SMS_PROVIDER cannot be mock in production');
  }

  if (process.env.TWILIO_VALIDATE_SIGNATURES === 'false') {
    throw new Error('TWILIO_VALIDATE_SIGNATURES cannot be false in production');
  }

  if (process.env.SMS_PROVIDER === 'twilio' && !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_AUTH_TOKEN is required in production');
  }

  if (!process.env.KYC_PROVIDER || process.env.KYC_PROVIDER === 'mock') {
    throw new Error('KYC_PROVIDER cannot be mock in production');
  }

  if (
    process.env.KYC_PROVIDER === 'verifyhq' &&
    !process.env.VERIFY_HQ_API_KEY
  ) {
    throw new Error('VERIFY_HQ_API_KEY is required in production');
  }

  if (process.env.FCM_USE_MOCK === 'true') {
    throw new Error('FCM_USE_MOCK must be false in production');
  }

  if (process.env.TWILIO_USE_MOCK === 'true') {
    throw new Error('TWILIO_USE_MOCK must be false in production');
  }

  if (process.env.AWS_USE_MOCK === 'true') {
    throw new Error('AWS_USE_MOCK must be false in production');
  }

  if (process.env.STELLAR_USE_MOCK === 'true') {
    throw new Error('STELLAR_USE_MOCK must be false in production');
  }
}

export { developmentConfig } from './development.config';
export { stagingConfig } from './staging.config';
export { productionConfig } from './production.config';
