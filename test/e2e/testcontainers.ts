import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import Redis from 'ioredis';

const RETRYABLE_TESTCONTAINERS_ERRORS = ['FinishedAt'];

interface SharedInfraInfo {
  host: string;
  postgresPort: number;
  redisPort: number;
}

async function startWithRetry<T>(
  start: () => Promise<T>,
  attempts = 6,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await start();
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : String(error ?? '');
      const retryable = RETRYABLE_TESTCONTAINERS_ERRORS.some((token) =>
        message.includes(token),
      );

      if (!retryable || attempt === attempts) {
        throw error;
      }

      // OrbStack/Testcontainers can briefly return an incomplete inspect result
      // after stopping a previous container. A short retry clears the race.
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  throw lastError;
}

export function startPostgresTestContainer(): Promise<StartedPostgreSqlContainer> {
  const sharedInfra = readSharedInfraInfo();
  if (sharedInfra) {
    return Promise.resolve({
      getHost: () => sharedInfra.host,
      getPort: () => sharedInfra.postgresPort,
      stop: async () => undefined,
    } as unknown as StartedPostgreSqlContainer);
  }

  return startWithRetry(() =>
    new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start(),
  );
}

export async function startRedisTestContainer(): Promise<StartedTestContainer> {
  const sharedInfra = readSharedInfraInfo();
  if (sharedInfra) {
    await flushSharedRedis(sharedInfra);
    return {
      getHost: () => sharedInfra.host,
      getMappedPort: () => sharedInfra.redisPort,
      stop: async () => undefined,
    } as unknown as StartedTestContainer;
  }

  return startWithRetry(() =>
    new GenericContainer('redis:7-alpine').withExposedPorts(6379).start(),
  );
}

function readSharedInfraInfo(): SharedInfraInfo | null {
  const infraFile =
    process.env.E2E_INFRA_FILE || resolve(__dirname, '../.tmp/e2e-infra.json');

  if (process.env.E2E_SHARED_INFRA !== 'true' && !existsSync(infraFile)) {
    return null;
  }

  if (!existsSync(infraFile)) {
    return null;
  }

  process.env.E2E_SHARED_INFRA = 'true';
  process.env.E2E_INFRA_FILE = infraFile;

  return JSON.parse(readFileSync(infraFile, 'utf8')) as SharedInfraInfo;
}

async function flushSharedRedis(sharedInfra: SharedInfraInfo): Promise<void> {
  const redis = new Redis({
    host: sharedInfra.host,
    port: sharedInfra.redisPort,
    db: 0,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  try {
    await redis.flushdb();
  } finally {
    await closeRedisTestClient(redis);
  }
}

async function closeRedisTestClient(redis: Redis): Promise<void> {
  let timeoutId: NodeJS.Timeout;
  const shutdownTimeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Redis test client shutdown timed out')),
      500,
    );
    timeoutId.unref();
  });

  try {
    await Promise.race([redis.quit(), shutdownTimeout]);
  } catch {
    redis.disconnect(false);
  } finally {
    clearTimeout(timeoutId!);
  }
}
