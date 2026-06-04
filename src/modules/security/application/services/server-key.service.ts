/**
 * Server Key Service
 *
 * Manages an RSA-OAEP keypair for JWE request decryption.
 * The keypair is generated on first boot and cached in Redis for persistence
 * across restarts. Rotates automatically based on configurable TTL.
 *
 * Flow:
 * 1. Mobile fetches server's public key from GET /security/public-key
 * 2. Mobile encrypts sensitive request bodies as JWE (RSA-OAEP-256 + A256GCM)
 * 3. Backend decrypts with the private key via JweDecryptInterceptor
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPair, exportJWK, importJWK, compactDecrypt } from 'jose';
import Redis from 'ioredis';

interface ServerKeyPair {
  publicJwk: Record<string, unknown>;
  privateJwk: Record<string, unknown>;
  kid: string;
  createdAt: number;
}

@Injectable()
export class ServerKeyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerKeyService.name);
  private readonly redis: Redis;
  private readonly REDIS_KEY = 'server:jwe:keypair';
  private readonly KEY_TTL_DAYS: number;
  private currentKey: ServerKeyPair | null = null;
  private isShuttingDown = false;
  private readonly disableRedisRetries = process.env.NODE_ENV === 'test';

  constructor(private readonly configService: ConfigService) {
    this.KEY_TTL_DAYS = parseInt(
      this.configService.get<string>('JWE_KEY_ROTATION_DAYS', '90'),
      10,
    );

    this.redis = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db', 0),
      retryStrategy: (times) => {
        if (this.isShuttingDown || this.disableRedisRetries) {
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    await this.ensureKeyPair();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;

    if (this.redis.status !== 'end') {
      this.redis.removeAllListeners?.();
      let timeoutId: NodeJS.Timeout;
      const shutdownTimeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Redis graceful shutdown timed out')),
          500,
        );
        timeoutId.unref();
      });

      try {
        await Promise.race([this.redis.quit(), shutdownTimeout]);
      } catch {
        this.redis.disconnect(false);
      } finally {
        clearTimeout(timeoutId!);
      }
    }
  }

  /**
   * Get the server's public key in JWK format (safe to expose).
   */
  getPublicKey(): Record<string, unknown> {
    if (!this.currentKey) {
      throw new Error('Server key pair not initialized');
    }
    return {
      ...this.currentKey.publicJwk,
      kid: this.currentKey.kid,
      use: 'enc',
      alg: 'RSA-OAEP-256',
    };
  }

  /**
   * Decrypt a JWE compact token using the server's private key.
   */
  async decrypt(jweToken: string): Promise<Record<string, unknown>> {
    if (!this.currentKey) {
      throw new Error('Server key pair not initialized');
    }

    const privateKey = await importJWK(
      this.currentKey.privateJwk as any,
      'RSA-OAEP-256',
    );
    const { plaintext } = await compactDecrypt(jweToken, privateKey);
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  /**
   * Ensure a valid keypair exists. Generates one if missing or expired.
   */
  private async ensureKeyPair(): Promise<void> {
    try {
      const stored = await this.redis.get(this.REDIS_KEY);
      if (stored) {
        const parsed: ServerKeyPair = JSON.parse(stored);
        const ageMs = Date.now() - parsed.createdAt;
        const maxAgeMs = this.KEY_TTL_DAYS * 24 * 60 * 60 * 1000;

        if (ageMs < maxAgeMs) {
          this.currentKey = parsed;
          this.logger.log(
            `Loaded server keypair (kid: ${parsed.kid}, age: ${Math.round(ageMs / 86400000)}d)`,
          );
          return;
        }
        this.logger.warn('Server keypair expired, rotating...');
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load keypair from Redis: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }

    await this.generateAndStore();
  }

  private async generateAndStore(): Promise<void> {
    this.logger.log('Generating RSA-OAEP-256 keypair for JWE...');

    const { publicKey, privateKey } = await generateKeyPair('RSA-OAEP-256', {
      modulusLength: 2048,
      extractable: true,
    });

    const publicJwk = await exportJWK(publicKey);
    const privateJwk = await exportJWK(privateKey);
    const kid = `srv-${Date.now().toString(36)}`;

    const keyPair: ServerKeyPair = {
      publicJwk: publicJwk as Record<string, unknown>,
      privateJwk: privateJwk as Record<string, unknown>,
      kid,
      createdAt: Date.now(),
    };

    const ttlSeconds = this.KEY_TTL_DAYS * 24 * 60 * 60;
    await this.redis.setex(this.REDIS_KEY, ttlSeconds, JSON.stringify(keyPair));

    this.currentKey = keyPair;
    this.logger.log(`Server keypair generated (kid: ${kid})`);
  }
}
