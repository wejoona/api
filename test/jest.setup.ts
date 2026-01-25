/**
 * Jest setup file for E2E tests
 * Runs before all test suites
 */

// Increase timeout for all tests (containers take time to start)
jest.setTimeout(30000);

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
