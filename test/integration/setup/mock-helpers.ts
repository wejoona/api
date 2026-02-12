/**
 * Mock Service Helpers
 *
 * Creates mock versions of services used across controller tests.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Create a generic mock service from method names
 */
export function createMockService<T extends Record<string, any>>(
  methods: (keyof T)[],
): jest.Mocked<T> {
  const mock: any = {};
  for (const method of methods) {
    mock[method] = jest.fn();
  }
  return mock;
}

/**
 * Common test data factories
 */
export const TestData = {
  uuid: () => uuidv4(),

  user: (overrides: Record<string, any> = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    phone: '+2250701234567',
    phoneVerified: true,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: null,
    countryCode: 'CI',
    kycStatus: 'verified',
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  wallet: (overrides: Record<string, any> = {}) => ({
    id: '660e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    balance: 1000,
    currency: 'USDC',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  transaction: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    walletId: '660e8400-e29b-41d4-a716-446655440000',
    type: 'transfer_internal',
    amount: 100,
    currency: 'USDC',
    status: 'completed',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  transfer: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    fromWalletId: '660e8400-e29b-41d4-a716-446655440000',
    toWalletId: uuidv4(),
    amount: 50,
    currency: 'USDC',
    status: 'completed',
    fee: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  deposit: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 100,
    sourceCurrency: 'XOF',
    targetCurrency: 'USDC',
    status: 'pending',
    provider: 'MTN',
    reference: `REF_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  beneficiary: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    phone: '+2250701234568',
    walletAddress: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  contact: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Jane Doe',
    phone: '+2250701234569',
    isRegistered: false,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  card: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    last4: '4242',
    brand: 'Visa',
    type: 'virtual',
    status: 'active',
    spendingLimit: 5000,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  paymentLink: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 25,
    currency: 'USDC',
    code: 'PAY123ABC',
    status: 'active',
    description: 'Test payment',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  savingsPot: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Vacation Fund',
    targetAmount: 500,
    currentAmount: 100,
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  merchant: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    businessName: 'Test Shop',
    category: 'retail',
    qrCode: 'QR_TEST_123',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  bankAccount: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    walletId: '660e8400-e29b-41d4-a716-446655440000',
    bankName: 'Test Bank',
    bankCode: 'TB001',
    accountNumber: '1234567890',
    accountName: 'Test User',
    status: 'verified',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  recurringTransfer: (overrides: Record<string, any> = {}) => ({
    id: uuidv4(),
    userId: '550e8400-e29b-41d4-a716-446655440000',
    recipientId: uuidv4(),
    amount: 50,
    currency: 'USDC',
    frequency: 'weekly',
    status: 'active',
    nextExecutionDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};
