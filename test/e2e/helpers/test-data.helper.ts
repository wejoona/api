import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestUser } from './test-user.helper';

/**
 * Helper class for seeding and managing test data
 */
export class TestDataHelper {
  private dataSource: DataSource;

  constructor(private readonly app: INestApplication) {
    this.dataSource = this.app.get(DataSource);
  }

  /**
   * Seed wallet balance for a user (for testing purposes)
   * This would typically be done via deposit in production
   */
  async seedWalletBalance(userId: string, amount: number) {
    // This is a helper for testing - in production, balances come from Blnk
    // For E2E tests, we might need to mock the Blnk API or create test transactions
    await this.dataSource.query(
      `
      INSERT INTO transactions (
        id, user_id, type, status, amount, currency,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'deposit', 'completed', $2, 'USDC',
        NOW(), NOW()
      )
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
      INSERT INTO transactions (
        id, user_id, type, status, amount, currency,
        metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'deposit', $2, $3, 'USDC',
        '{"source": "test"}', NOW(), NOW()
      )
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
      INSERT INTO transactions (
        id, user_id, type, status, amount, currency,
        metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'withdrawal', $2, $3, 'USDC',
        '{"destination": "test"}', NOW(), NOW()
      )
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
      INSERT INTO transactions (
        id, user_id, type, status, amount, currency,
        metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'transfer', $2, $3, 'USDC',
        jsonb_build_object('recipientId', $4), NOW(), NOW()
      )
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
      SELECT * FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
      [userId],
    );
  }

  /**
   * Clear all test data
   */
  async clearAllData() {
    const entities = this.dataSource.entityMetadatas;

    // Disable foreign key checks
    await this.dataSource.query('SET session_replication_role = replica;');

    for (const entity of entities) {
      await this.dataSource.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }

    // Re-enable foreign key checks
    await this.dataSource.query('SET session_replication_role = DEFAULT;');
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
    valid: '1234',
    another: '5678',
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
