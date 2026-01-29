import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Connection } from 'typeorm';
import { Cache } from 'cache-manager';

/**
 * Graceful Shutdown Service
 *
 * Handles application shutdown gracefully by:
 * 1. Stopping acceptance of new requests
 * 2. Waiting for in-flight requests to complete
 * 3. Closing database connections
 * 4. Closing Redis/cache connections
 * 5. Logging shutdown progress
 */
@Injectable()
export class ShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(ShutdownService.name);
  private isShuttingDown = false;
  private shutdownTimeout: number = 30000; // 30 seconds default
  private activeRequests = 0;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Check if application is shutting down
   */
  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Increment active request counter
   */
  incrementActiveRequests(): void {
    this.activeRequests++;
  }

  /**
   * Decrement active request counter
   */
  decrementActiveRequests(): void {
    this.activeRequests--;
  }

  /**
   * Get current active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * Set custom shutdown timeout (in milliseconds)
   */
  setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.isShuttingDown = true;
    this.logger.log(
      `Received ${signal} signal, initiating graceful shutdown...`,
    );

    try {
      // Step 1: Stop accepting new requests (handled by middleware)
      this.logger.log('Step 1/4: Stopped accepting new requests');

      // Step 2: Wait for in-flight requests to complete
      await this.waitForActiveRequests();
      this.logger.log('Step 2/4: All in-flight requests completed');

      // Step 3: Close database connections
      await this.closeDatabaseConnections();
      this.logger.log('Step 3/4: Database connections closed');

      // Step 4: Close Redis/cache connections
      await this.closeCacheConnections();
      this.logger.log('Step 4/4: Cache connections closed');

      this.logger.log('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Wait for all active requests to complete or timeout
   */
  private async waitForActiveRequests(): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    while (this.activeRequests > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= this.shutdownTimeout) {
        this.logger.warn(
          `Shutdown timeout reached with ${this.activeRequests} active requests. Forcing shutdown.`,
        );
        break;
      }

      this.logger.debug(
        `Waiting for ${this.activeRequests} active requests to complete... (${Math.floor(elapsed / 1000)}s elapsed)`,
      );

      await this.sleep(pollInterval);
    }
  }

  /**
   * Close database connections properly
   */
  private async closeDatabaseConnections(): Promise<void> {
    try {
      if (this.connection.isConnected) {
        this.logger.log('Closing database connection pool...');
        await this.connection.close();
        this.logger.log('Database connection pool closed');
      } else {
        this.logger.log('Database connection already closed');
      }
    } catch (error) {
      this.logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Close Redis/cache connections
   */
  private async closeCacheConnections(): Promise<void> {
    try {
      this.logger.log('Closing Redis/cache connections...');

      // The cache-manager-redis-yet store has a disconnect method
      const store = (this.cacheManager as any).store;

      if (store && typeof store.client?.disconnect === 'function') {
        await store.client.disconnect();
        this.logger.log('Redis cache connection closed');
      } else if (store && typeof store.client?.quit === 'function') {
        await store.client.quit();
        this.logger.log('Redis cache connection closed');
      } else {
        this.logger.log('No Redis connection to close or already closed');
      }
    } catch (error) {
      this.logger.error('Error closing cache connections:', error);
      throw error;
    }
  }

  /**
   * NestJS lifecycle hook - called when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('ShutdownService module destroyed');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
