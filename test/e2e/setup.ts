import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import {
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';
import { DataSource, EntityMetadata } from 'typeorm';
import { ensureDatabaseSchemas } from './database-schemas';
import {
  startPostgresTestContainer,
  startRedisTestContainer,
} from './testcontainers';

/**
 * E2E Test Setup
 *
 * Manages test infrastructure including:
 * - PostgreSQL container for database
 * - Redis container for caching
 * - NestJS application setup
 *
 * Usage:
 * ```typescript
 * let setup: E2ETestSetup;
 * let app: INestApplication;
 *
 * beforeAll(async () => {
 *   setup = new E2ETestSetup();
 *   app = await setup.setup();
 * }, 60000);
 *
 * afterAll(async () => {
 *   await setup.teardown();
 * });
 * ```
 */
export class E2ETestSetup {
  app: INestApplication;
  postgresContainer: StartedPostgreSqlContainer;
  redisContainer: StartedTestContainer;
  dataSource: DataSource;

  /**
   * Setup test infrastructure
   * Starts containers and initializes NestJS app
   */
  async setup(): Promise<INestApplication> {
    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...');
    this.postgresContainer = await startPostgresTestContainer();

    // Start Redis container
    console.log('Starting Redis container...');
    this.redisContainer = await startRedisTestContainer();

    // Set environment variables for test
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_HOST = this.postgresContainer.getHost();
    process.env.DATABASE_PORT = this.postgresContainer.getPort().toString();
    process.env.DATABASE_NAME = 'test_db';
    process.env.DATABASE_USER = 'test_user';
    process.env.DATABASE_PASSWORD = 'test_password';
    process.env.REDIS_HOST = this.redisContainer.getHost();
    process.env.REDIS_PORT = this.redisContainer.getMappedPort(6379).toString();
    process.env.REDIS_PASSWORD = '';
    process.env.REDIS_DB = '0';

    // JWT secret for testing
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-tests';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-e2e-tests';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';

    // Rate limiting (more permissive for tests)
    process.env.RATE_LIMIT_TTL = '60';
    process.env.RATE_LIMIT_LIMIT = '1000';

    // Mock external service URLs
    process.env.CIRCLE_API_URL = 'http://localhost:3999/circle';
    process.env.YELLOWCARD_API_URL = 'http://localhost:3999/yellowcard';
    process.env.BLNK_API_URL = 'http://localhost:3999/blnk';
    process.env.CIRCLE_WEBHOOK_SECRET = 'test-circle-webhook-secret';
    process.env.YELLOW_CARD_WEBHOOK_SECRET = 'test-yellow-card-webhook-secret';
    process.env.YELLOW_CARD_ENABLED = 'true';
    process.env.YELLOW_CARD_USE_MOCK = 'true';
    process.env.DEPOSIT_USE_MOCK = 'true';
    process.env.CIRCLE_USE_MOCK = 'true';

    // Disable external notifications in tests
    process.env.NOTIFICATION_ENABLED = 'false';

    await ensureDatabaseSchemas();

    console.log('Creating NestJS application...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.getHttpAdapter().getInstance().disable('x-powered-by');

    // Apply global pipes (same as production)
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await this.app.init();

    // Get DataSource for migrations
    this.dataSource = this.app.get(DataSource);

    // Run migrations
    console.log('Running database migrations...');
    await this.dataSource.runMigrations();

    console.log('E2E setup complete');
    return this.app;
  }

  /**
   * Teardown test infrastructure
   * Stops containers and closes app
   */
  async teardown() {
    console.log('Tearing down E2E setup...');

    if (this.app) {
      await this.app.close().catch((error) => {
        if (
          !(error instanceof Error) ||
          !error.message.includes('Connection is closed')
        ) {
          throw error;
        }
      });
    }

    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }

    if (this.postgresContainer) {
      await this.postgresContainer.stop();
    }

    if (this.redisContainer) {
      await this.redisContainer.stop();
    }

    console.log('E2E teardown complete');
  }

  /**
   * Clean database between tests
   * Truncates all tables while preserving schema
   */
  async cleanDatabase() {
    if (!this.dataSource) {
      return;
    }

    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE TABLE ${this.getTableIdentifier(entity)} CASCADE;`,
      );
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
   * Get the NestJS application instance
   */
  getApp(): INestApplication {
    return this.app;
  }

  /**
   * Get the database connection
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
