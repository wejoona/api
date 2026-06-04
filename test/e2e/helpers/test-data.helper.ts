import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource, EntityMetadata } from 'typeorm';
import Redis from 'ioredis';
import type { Cache } from 'cache-manager';
import { closeRedisClient } from '@/common/redis/redis-client.helper';

/**
 * Helper class for seeding and managing test data
 */
export class TestDataHelper {
  private dataSource: DataSource;
  private cacheManager: Cache | null = null;

  constructor(private readonly app: INestApplication) {
    this.dataSource = this.app.get(DataSource);
    this.cacheManager = this.app.get<Cache>(CACHE_MANAGER, {
      strict: false,
    });
  }

  /**
   * Seed wallet balance for a user (for testing purposes)
   * This would typically be done via deposit in production
   */
  async seedWalletBalance(userId: string, amount: number) {
    await this.dataSource.query(
      `
      WITH wallet AS (
        UPDATE wallets
        SET balance = $2
        WHERE user_id = $1
        RETURNING id
      )
      INSERT INTO transactions (
        id, wallet_id, type, status, amount, currency,
        metadata, created_at, completed_at
      )
      SELECT
        gen_random_uuid(), id, 'deposit', 'completed', $2, 'USDC',
        '{"source": "test_seed"}', NOW(), NOW()
      FROM wallet
    `,
      [userId, amount],
    );
  }

  /**
   * Create a test deposit transaction
   */
  async createTestDeposit(
    userId: string,
    amount: number,
    status: 'pending' | 'completed' | 'failed' = 'completed',
  ) {
    const result = await this.dataSource.query(
      `
      WITH wallet AS (
        SELECT id FROM wallets WHERE user_id = $1
      )
      INSERT INTO transactions (
        id, wallet_id, type, status, amount, currency,
        metadata, created_at, completed_at
      )
      SELECT
        gen_random_uuid(), id, 'deposit', $2::varchar, $3::numeric, 'USDC',
        '{"source": "test"}', NOW(), CASE WHEN $2::varchar = 'completed' THEN NOW() ELSE NULL END
      FROM wallet
      RETURNING *
    `,
      [userId, status, amount],
    );

    return result[0];
  }

  /**
   * Create a test withdrawal transaction
   */
  async createTestWithdrawal(
    userId: string,
    amount: number,
    status: 'pending' | 'completed' | 'failed' = 'completed',
  ) {
    const result = await this.dataSource.query(
      `
      WITH wallet AS (
        SELECT id FROM wallets WHERE user_id = $1
      )
      INSERT INTO transactions (
        id, wallet_id, type, status, amount, currency,
        metadata, created_at, completed_at
      )
      SELECT
        gen_random_uuid(), id, 'withdrawal', $2::varchar, $3::numeric, 'USDC',
        '{"destination": "test"}', NOW(), CASE WHEN $2::varchar = 'completed' THEN NOW() ELSE NULL END
      FROM wallet
      RETURNING *
    `,
      [userId, status, amount],
    );

    return result[0];
  }

  /**
   * Create a test transfer between users
   */
  async createTestTransfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    status: 'pending' | 'completed' | 'failed' = 'completed',
  ) {
    const result = await this.dataSource.query(
      `
      WITH wallets_for_transfer AS (
        SELECT
          sender.id AS sender_wallet_id,
          recipient.id AS recipient_wallet_id
        FROM wallets sender
        CROSS JOIN wallets recipient
        WHERE sender.user_id = $1 AND recipient.user_id = $4
      )
      INSERT INTO transactions (
        id, wallet_id, type, status, amount, currency,
        recipient_wallet_id, metadata, created_at, completed_at
      )
      SELECT
        gen_random_uuid(), sender_wallet_id, 'transfer', $2::varchar, $3::numeric, 'USDC',
        recipient_wallet_id, jsonb_build_object('recipientId', $4),
        NOW(), CASE WHEN $2::varchar = 'completed' THEN NOW() ELSE NULL END
      FROM wallets_for_transfer
      RETURNING *
    `,
      [fromUserId, status, amount, toUserId],
    );

    return result[0];
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(userId: string) {
    return this.dataSource.query(
      `
      SELECT transactions.*
      FROM transactions
      INNER JOIN wallets ON wallets.id = transactions.wallet_id
      WHERE wallets.user_id = $1
      ORDER BY transactions.created_at DESC
    `,
      [userId],
    );
  }

  /**
   * Clear all test data
   */
  async clearAllData() {
    await this.waitForAsyncEventHandlers();
    await this.clearNestCache();

    const entities = this.dataSource.entityMetadatas;

    // Disable foreign key checks
    await this.dataSource.query('SET session_replication_role = replica;');

    try {
      for (const entity of entities) {
        await this.dataSource.query(
          `TRUNCATE TABLE ${this.getTableIdentifier(entity)} CASCADE;`,
        );
      }
    } finally {
      // Re-enable foreign key checks
      await this.dataSource.query('SET session_replication_role = DEFAULT;');
    }

    await this.clearRedis();
  }

  private async waitForAsyncEventHandlers() {
    // EventEmitter2 emit() returns before async listeners settle; yield before destructive truncation.
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  private async clearNestCache() {
    const cache = this.cacheManager as any;
    if (!cache) {
      return;
    }

    if (typeof cache.clear === 'function') {
      await cache.clear();
    } else if (typeof cache.reset === 'function') {
      await cache.reset();
    } else if (typeof cache.store?.reset === 'function') {
      await cache.store.reset();
    }
  }

  private async clearRedis() {
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    try {
      await redis.flushdb();
    } finally {
      await closeRedisClient(redis, undefined, 'Redis test client');
    }
  }

  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private getTableIdentifier(entity: EntityMetadata): string {
    const tableName = this.quoteIdentifier(entity.tableName);
    return entity.schema
      ? `${this.quoteIdentifier(entity.schema)}.${tableName}`
      : tableName;
  }

  /**
   * Execute raw SQL query
   */
  async executeQuery(query: string, parameters?: any[]) {
    return this.dataSource.query(query, parameters);
  }

  /**
   * Get entity repository
   */
  getRepository<T>(entity: any) {
    return this.dataSource.getRepository<T>(entity);
  }
}

/**
 * Test data fixtures
 */
export const TestFixtures = {
  /**
   * Sample user data
   */
  users: {
    validPhone: '+2250700000001',
    anotherPhone: '+2250700000002',
    invalidPhone: 'invalid',
    countryCode: 'CI',
  },

  /**
   * Sample OTP codes
   */
  otp: {
    valid: '123456',
    invalid: '000000',
  },

  /**
   * Sample PIN codes
   */
  pin: {
    valid: '6829',
    another: '7391',
    invalid: '0000',
  },

  /**
   * Sample transaction amounts
   */
  amounts: {
    small: 10,
    medium: 100,
    large: 1000,
    tooLarge: 1000000,
  },

  /**
   * Sample blockchain addresses
   */
  addresses: {
    validEthereum: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    validPolygon: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    invalid: 'invalid-address',
  },

  /**
   * Sample usernames
   */
  usernames: {
    valid: 'johndoe',
    withAt: '@janedoe',
    invalid: 'a', // too short
    taken: 'admin',
  },
};
