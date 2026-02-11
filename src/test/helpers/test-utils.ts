/**
 * Test Utilities
 *
 * Provides mock factories and test helpers for unit testing.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentGateway,
  CreateSubwalletRequest,
  Subwallet,
  BalanceResponse,
  InitiateDepositRequest,
  DepositResponse,
  InternalTransferRequest,
  ExternalTransferRequest,
  TransferResponse,
  RateRequest,
  RateResponse,
  SubmitKycRequest,
  KycResponse,
  WebhookEvent,
} from '../../modules/shared/domain/gateways/payment.gateway';
import {
  ISmsGateway,
  SendSmsRequest,
  SmsResponse,
} from '../../modules/shared/domain/gateways/sms.gateway';
import {
  User,
  IUser,
  KycStatus,
} from '../../modules/user/application/domain/entities/user.entity';
import { WalletOrmEntity } from '../../modules/wallet/infrastructure/orm-entities/wallet.orm-entity';
import {
  TransactionEntity,
  TransactionType,
  TransactionStatus,
} from '../../modules/transaction/domain/entities/transaction.entity';

// ============================================
// MOCK REPOSITORY FACTORY
// ============================================

export interface MockRepository<T> {
  save: jest.Mock<Promise<T>, [T]>;
  findById: jest.Mock<Promise<T | null>, [string]>;
  findByPhone?: jest.Mock<Promise<T | null>, [string]>;
  findByWalletId?: jest.Mock<Promise<T[]>, [string]>;
  findAll: jest.Mock<Promise<T[]>, []>;
  delete: jest.Mock<Promise<void>, [string]>;
  update?: jest.Mock<Promise<void>, [string, any]>;
  getDailyTransferVolume?: jest.Mock<Promise<number>, [string, Date]>;
  existsByPhone?: jest.Mock<Promise<boolean>, [string]>;
  existsByUsername?: jest.Mock<Promise<boolean>, [string]>;
  findByUsername?: jest.Mock<Promise<T | null>, [string]>;
}

export function createMockRepository<T>(): MockRepository<T> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByPhone: jest.fn(),
    findByWalletId: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    getDailyTransferVolume: jest.fn().mockResolvedValue(0),
    existsByPhone: jest.fn().mockResolvedValue(false),
    existsByUsername: jest.fn().mockResolvedValue(false),
    findByUsername: jest.fn().mockResolvedValue(null),
  };
}

// ============================================
// MOCK PAYMENT GATEWAY
// ============================================

export function createMockPaymentGateway(): jest.Mocked<IPaymentGateway> {
  return {
    providerName: 'MockPaymentGateway',

    createSubwallet: jest.fn().mockImplementation(
      async (request: CreateSubwalletRequest): Promise<Subwallet> => ({
        id: uuidv4(),
        externalId: `ext_${uuidv4()}`,
        userId: request.userId,
        address: `0x${Array(40).fill('a').join('')}`,
        currency: 'USDC',
        createdAt: new Date(),
      }),
    ),

    getBalance: jest.fn().mockImplementation(
      async (subwalletId: string): Promise<BalanceResponse> => ({
        subwalletId,
        balances: [
          { currency: 'USDC', available: 1000, pending: 0, total: 1000 },
        ],
      }),
    ),

    getOnRampChannels: jest.fn().mockResolvedValue([]),

    initiateDeposit: jest.fn().mockImplementation(
      async (request: InitiateDepositRequest): Promise<DepositResponse> => ({
        id: uuidv4(),
        externalId: `dep_${uuidv4()}`,
        subwalletId: request.subwalletId,
        amount: request.amount,
        sourceCurrency: request.sourceCurrency,
        targetCurrency: request.targetCurrency,
        rate: 1.0,
        fee: 0,
        status: 'pending',
        paymentInstructions: {
          type: 'mobile_money',
          provider: 'MTN',
          reference: `REF_${Date.now()}`,
          instructions: 'Pay to account',
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    ),

    getDepositStatus: jest.fn().mockImplementation(
      async (depositId: string): Promise<DepositResponse> => ({
        id: depositId,
        externalId: `ext_${depositId}`,
        subwalletId: 'mock-subwallet',
        amount: 100,
        sourceCurrency: 'XOF',
        targetCurrency: 'USDC',
        rate: 0.0016,
        fee: 0,
        status: 'completed',
        paymentInstructions: {
          type: 'mobile_money',
          provider: 'MTN',
          reference: 'REF123',
          instructions: 'Pay to account',
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    ),

    internalTransfer: jest.fn().mockImplementation(
      async (request: InternalTransferRequest): Promise<TransferResponse> => ({
        id: uuidv4(),
        externalId: `txn_${uuidv4()}`,
        type: 'internal',
        fromSubwalletId: request.fromSubwalletId,
        toSubwalletId: request.toSubwalletId,
        amount: request.amount,
        currency: request.currency,
        fee: 0,
        status: 'completed',
        createdAt: new Date(),
      }),
    ),

    externalTransfer: jest.fn().mockImplementation(
      async (request: ExternalTransferRequest): Promise<TransferResponse> => ({
        id: uuidv4(),
        externalId: `txn_${uuidv4()}`,
        type: 'external',
        fromSubwalletId: request.subwalletId,
        toAddress: request.toAddress,
        amount: request.amount,
        currency: request.currency,
        fee: request.amount * 0.005,
        status: 'completed',
        txHash: `0x${Array(64).fill('a').join('')}`,
        createdAt: new Date(),
      }),
    ),

    getTransferStatus: jest.fn().mockImplementation(
      async (transferId: string): Promise<TransferResponse> => ({
        id: transferId,
        externalId: `ext_${transferId}`,
        type: 'internal',
        fromSubwalletId: 'mock-from',
        amount: 100,
        currency: 'USDC',
        fee: 0,
        status: 'completed',
        createdAt: new Date(),
      }),
    ),

    getRate: jest.fn().mockImplementation(
      async (request: RateRequest): Promise<RateResponse> => ({
        sourceCurrency: request.sourceCurrency,
        targetCurrency: request.targetCurrency,
        rate: 1.0,
        sourceAmount: request.amount,
        targetAmount: request.amount,
        fee: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      }),
    ),

    submitKyc: jest.fn().mockImplementation(
      async (request: SubmitKycRequest): Promise<KycResponse> => ({
        id: uuidv4(),
        subwalletId: request.subwalletId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),

    getKycStatus: jest.fn().mockImplementation(
      async (subwalletId: string): Promise<KycResponse> => ({
        id: uuidv4(),
        subwalletId,
        status: 'verified',
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),

    verifyWebhookSignature: jest.fn().mockReturnValue(true),

    parseWebhookEvent: jest.fn().mockImplementation(
      (payload: Record<string, unknown>): WebhookEvent => ({
        id: uuidv4(),
        type: 'deposit.completed',
        referenceId: (payload.referenceId as string) || uuidv4(),
        externalId: (payload.externalId as string) || uuidv4(),
        data: payload,
        createdAt: new Date(),
      }),
    ),
  };
}

// ============================================
// MOCK SMS GATEWAY
// ============================================

export function createMockSmsGateway(): jest.Mocked<ISmsGateway> {
  return {
    providerName: 'MockSmsGateway',

    send: jest.fn().mockImplementation(
      async (request: SendSmsRequest): Promise<SmsResponse> => ({
        id: uuidv4(),
        to: request.to,
        status: 'sent',
        provider: 'MockSmsGateway',
        createdAt: new Date(),
      }),
    ),

    sendOtp: jest.fn().mockImplementation(
      async (phone: string, _otp: string): Promise<SmsResponse> => ({
        id: uuidv4(),
        to: phone,
        status: 'sent',
        provider: 'MockSmsGateway',
        createdAt: new Date(),
      }),
    ),

    getStatus: jest.fn().mockImplementation(
      async (messageId: string): Promise<SmsResponse> => ({
        id: messageId,
        to: '+1234567890',
        status: 'delivered',
        provider: 'MockSmsGateway',
        createdAt: new Date(),
      }),
    ),
  };
}

// ============================================
// MOCK DATA SOURCE (TYPEORM)
// ============================================

export interface MockEntityManager {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  update: jest.Mock;
}

export interface MockDataSource {
  transaction: jest.Mock;
  createQueryRunner: jest.Mock;
  manager: MockEntityManager;
}

export function createMockDataSource(): MockDataSource {
  const mockManager: MockEntityManager = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    remove: jest.fn(),
    update: jest.fn(),
  };

  return {
    transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockManager);
    }),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockManager,
    }),
    manager: mockManager,
  };
}

// ============================================
// MOCK REDIS CLIENT
// ============================================

export interface MockRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  incr: jest.Mock;
  expire: jest.Mock;
  sadd: jest.Mock;
  sismember: jest.Mock;
  pipeline: jest.Mock;
  quit: jest.Mock;
  on: jest.Mock;
}

export function createMockRedisClient(): MockRedisClient {
  const mockPipeline = {
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    sismember: jest.fn().mockResolvedValue(0),
    pipeline: jest.fn().mockReturnValue(mockPipeline),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
  };
}

// ============================================
// MOCK CACHE MANAGER
// ============================================

export interface MockCacheManager {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  reset: jest.Mock;
}

export function createMockCacheManager(): MockCacheManager {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================
// TEST ENTITY FACTORIES
// ============================================

export interface CreateTestUserOptions {
  id?: string;
  phone?: string;
  phoneVerified?: boolean;
  kycStatus?: KycStatus;
  hasPin?: boolean;
  pinHash?: string;
  pinAttempts?: number;
  pinLockedUntil?: Date | null;
  isActive?: boolean;
}

export function createTestUser(options: CreateTestUserOptions = {}): User {
  const now = new Date();
  const userData: IUser = {
    id: options.id || uuidv4(),
    phone: options.phone || '+2250123456789',
    phoneVerified: options.phoneVerified ?? true,
    username: null,
    firstName: 'Test',
    lastName: 'User',
    email: null,
    avatarUrl: null,
    countryCode: 'CI',
    preferredLocale: 'fr',
    kycStatus: options.kycStatus || 'pending',
    kycProviderId: null,
    circleUserId: null,
    circleUserToken: null,
    role: 'user',
    status: options.isActive !== false ? 'active' : 'suspended',
    suspendedAt: null,
    suspendedReason: null,
    pinHash: options.hasPin ? options.pinHash || 'hashed_pin_123' : null,
    pinSetAt: options.hasPin ? now : null,
    pinAttempts: options.pinAttempts || 0,
    pinLockedUntil: options.pinLockedUntil || null,
    createdAt: now,
    updatedAt: now,
  };

  return User.reconstitute(userData);
}

export interface CreateTestWalletOptions {
  id?: string;
  userId?: string;
  balance?: number;
  status?: string;
  yellowCardWalletId?: string;
  version?: number;
}

export function createTestWallet(
  options: CreateTestWalletOptions = {},
): WalletOrmEntity {
  const wallet = new WalletOrmEntity();
  wallet.id = options.id || uuidv4();
  wallet.userId = options.userId || uuidv4();
  wallet.balance = options.balance ?? 1000;
  wallet.status = options.status || 'active';
  wallet.yellowCardWalletId = options.yellowCardWalletId || `yc_${uuidv4()}`;
  wallet.circleWalletId = null;
  wallet.circleWalletAddress = null;
  wallet.currency = 'USDC';
  wallet.kycStatus = 'none';
  wallet.version = options.version ?? 1;
  wallet.createdAt = new Date();
  wallet.updatedAt = new Date();
  return wallet;
}

export interface CreateTestTransactionOptions {
  id?: string;
  walletId?: string;
  type?: TransactionType;
  amount?: number;
  status?: TransactionStatus;
  recipientWalletId?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

export function createTestTransaction(
  options: CreateTestTransactionOptions = {},
): TransactionEntity {
  const type = options.type || 'transfer_internal';

  if (type === 'transfer_internal') {
    return TransactionEntity.createInternalTransfer({
      walletId: options.walletId || uuidv4(),
      amount: options.amount || 100,
      recipientWalletId: options.recipientWalletId || uuidv4(),
      recipientPhone: options.recipientPhone || '+2250987654321',
      currency: 'USD',
    });
  }

  if (type === 'transfer_external') {
    return TransactionEntity.createExternalTransfer({
      walletId: options.walletId || uuidv4(),
      amount: options.amount || 100,
      recipientAddress: options.recipientAddress || '0x' + 'a'.repeat(40),
      currency: 'USD',
    });
  }

  return TransactionEntity.createDeposit({
    walletId: options.walletId || uuidv4(),
    amount: options.amount || 100,
    currency: 'USD',
  });
}

// ============================================
// MOCK JWT SERVICE
// ============================================

export interface MockJwtService {
  sign: jest.Mock;
  verify: jest.Mock;
  decode: jest.Mock;
}

export function createMockJwtService(): MockJwtService {
  return {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn().mockReturnValue({
      sub: uuidv4(),
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    decode: jest.fn().mockReturnValue({
      sub: uuidv4(),
      type: 'refresh',
    }),
  };
}

// ============================================
// MOCK CONFIG SERVICE
// ============================================

export interface MockConfigService {
  get: jest.Mock;
  getOrThrow: jest.Mock;
}

export function createMockConfigService(
  config: Record<string, unknown> = {},
): MockConfigService {
  const defaultConfig: Record<string, unknown> = {
    'redis.host': 'localhost',
    'redis.port': 6379,
    'redis.password': '',
    'otp.expiresIn': 300,
    'otp.length': 6,
    'otp.maxAttempts': 3,
    'otp.enableDebugLogging': false,
    nodeEnv: 'test',
    'jwt.refreshSecret': 'test-refresh-secret',
    'jwt.refreshExpiresIn': '7d',
    ...config,
  };

  return {
    get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
      return defaultConfig[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      const value = defaultConfig[key];
      if (value === undefined) {
        throw new Error(`Config key ${key} not found`);
      }
      return value;
    }),
  };
}

// ============================================
// OPTIMISTIC LOCK ERROR
// ============================================

export class MockOptimisticLockVersionMismatchError extends Error {
  constructor() {
    super('Optimistic lock version mismatch');
    this.name = 'OptimisticLockVersionMismatchError';
  }
}
