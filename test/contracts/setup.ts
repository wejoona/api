/**
 * Contract Tests Setup
 *
 * This file sets up custom matchers and global utilities for contract testing.
 */

import {
  toMatchContract,
  toBeValidResponse,
} from './matchers/contract-matchers';

// Extend Jest matchers
expect.extend({
  toMatchContract,
  toBeValidResponse,
});

// Global test timeout for contract tests
jest.setTimeout(10000);

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
}
