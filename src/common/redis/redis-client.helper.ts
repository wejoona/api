import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

interface RedisClientOptions {
  db?: number;
  maxRetriesPerRequest?: number;
  connectTimeout?: number;
  lazyConnect?: boolean;
  retryLogContext?: string;
  isShuttingDown?: () => boolean;
  overrides?: RedisOptions;
}

export function createConfiguredRedisClient(
  configService: ConfigService,
  logger: Logger,
  options: RedisClientOptions = {},
): Redis {
  const disableRetries = process.env.NODE_ENV === 'test';
  const isShuttingDown = options.isShuttingDown ?? (() => false);

  return new Redis({
    host: configService.get<string>('redis.host', 'localhost'),
    port: configService.get<number>('redis.port', 6379),
    password: configService.get<string>('redis.password'),
    db: options.db ?? configService.get<number>('redis.db'),
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
    connectTimeout: options.connectTimeout,
    lazyConnect: options.lazyConnect,
    retryStrategy: (times) => {
      if (isShuttingDown() || disableRetries) {
        return null;
      }

      const delay = Math.min(times * 50, 2000);
      if (options.retryLogContext) {
        logger.warn(
          `Redis connection retry attempt ${times} for ${options.retryLogContext}, waiting ${delay}ms`,
        );
      }
      return delay;
    },
    ...options.overrides,
  });
}

export async function closeRedisClient(
  redis: Redis | undefined,
  logger?: Logger,
  label = 'Redis',
  timeoutMs = 500,
): Promise<void> {
  if (!redis || redis.status === 'end') {
    return;
  }

  redis.removeAllListeners?.();
  let timeoutId: NodeJS.Timeout | undefined;
  const shutdownTimeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} graceful shutdown timed out`)),
      timeoutMs,
    );
    timeoutId.unref();
  });

  try {
    await Promise.race([redis.quit(), shutdownTimeout]);
  } catch {
    redis.disconnect(false);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  logger?.log(`${label} connection closed gracefully`);
}
