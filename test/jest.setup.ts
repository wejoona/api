/**
 * Jest setup file for E2E tests
 * Runs before all test suites
 */

import { Logger } from '@nestjs/common';

// Increase timeout for all tests (app bootstrap and migrations take time)
jest.setTimeout(120000);

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-e2e-tests';
process.env.JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || '30d';
process.env.RATE_LIMIT_TTL = process.env.RATE_LIMIT_TTL || '60';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '10000';
process.env.OTP_RATE_LIMIT_MAX = process.env.OTP_RATE_LIMIT_MAX || '1000';
process.env.DATABASE_SYNCHRONIZE =
  process.env.DATABASE_SYNCHRONIZE || 'true';
process.env.REDIS_DB = process.env.REDIS_DB || '15';
process.env.CIRCLE_API_URL =
  process.env.CIRCLE_API_URL || 'http://localhost:3999/circle';
process.env.YELLOWCARD_API_URL =
  process.env.YELLOWCARD_API_URL || 'http://localhost:3999/yellowcard';
process.env.BLNK_API_URL =
  process.env.BLNK_API_URL || 'http://localhost:3999/blnk';
process.env.NOTIFICATION_ENABLED = process.env.NOTIFICATION_ENABLED || 'false';
process.env.TESTCONTAINERS_RYUK_DISABLED =
  process.env.TESTCONTAINERS_RYUK_DISABLED || 'true';
process.env.VAULT_MASTER_KEY =
  process.env.VAULT_MASTER_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

Logger.overrideLogger(false);

// Global setup
beforeAll(() => {
  console.log('Starting E2E test suite...');
});

// Global teardown
afterAll(() => {
  console.log('E2E test suite completed');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
