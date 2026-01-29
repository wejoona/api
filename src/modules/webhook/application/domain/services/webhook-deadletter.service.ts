import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeadletterOrmEntity } from '../../../infrastructure/orm-entities/webhook-deadletter.orm-entity';

export interface LogDeadletterParams {
  provider: string;
  eventType: string;
  webhookId?: string;
  payload: Record<string, unknown>;
  error: Error | string;
}

/**
 * Webhook Dead Letter Service
 *
 * Manages failed webhooks that couldn't be processed.
 * Provides logging, retrieval, and resolution capabilities.
 */
@Injectable()
export class WebhookDeadletterService {
  private readonly logger = new Logger(WebhookDeadletterService.name);

  constructor(
    @InjectRepository(WebhookDeadletterOrmEntity)
    private readonly repository: Repository<WebhookDeadletterOrmEntity>,
  ) {}

  /**
   * Log a failed webhook to the dead-letter queue
   */
  async log(params: LogDeadletterParams): Promise<WebhookDeadletterOrmEntity> {
    const errorMessage =
      params.error instanceof Error
        ? params.error.message
        : String(params.error);
    const errorStack =
      params.error instanceof Error ? params.error.stack : undefined;

    const deadletter = this.repository.create({
      provider: params.provider,
      eventType: params.eventType,
      webhookId: params.webhookId || null,
      payload: params.payload,
      errorMessage,
      errorStack: errorStack || null,
      status: 'pending',
      retryCount: 0,
    });

    const saved = await this.repository.save(deadletter);
    this.logger.warn(
      `Webhook logged to dead-letter queue: ${params.provider}/${params.eventType} - ${errorMessage}`,
    );

    return saved;
  }

  /**
   * Find all pending dead-letter entries
   */
  async findPending(): Promise<WebhookDeadletterOrmEntity[]> {
    return this.repository.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find dead-letter entries by provider
   */
  async findByProvider(
    provider: string,
  ): Promise<WebhookDeadletterOrmEntity[]> {
    return this.repository.find({
      where: { provider },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Mark a dead-letter entry as resolved
   */
  async resolve(id: string, resolvedBy: string, notes?: string): Promise<void> {
    await this.repository.update(id, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNotes: notes || null,
    });
    this.logger.log(`Dead-letter ${id} resolved by ${resolvedBy}`);
  }

  /**
   * Mark a dead-letter entry as ignored
   */
  async ignore(id: string, ignoredBy: string, reason?: string): Promise<void> {
    await this.repository.update(id, {
      status: 'ignored',
      resolvedAt: new Date(),
      resolvedBy: ignoredBy,
      resolutionNotes: reason || null,
    });
    this.logger.log(
      `Dead-letter ${id} ignored by ${ignoredBy}: ${reason || 'No reason provided'}`,
    );
  }

  /**
   * Increment retry count for a dead-letter entry
   */
  async incrementRetry(id: string): Promise<void> {
    await this.repository.increment({ id }, 'retryCount', 1);
    await this.repository.update(id, { lastRetryAt: new Date() });
  }

  /**
   * Get statistics about the dead-letter queue
   */
  async getStats(): Promise<{
    pending: number;
    resolved: number;
    ignored: number;
    total: number;
  }> {
    const [pending, resolved, ignored] = await Promise.all([
      this.repository.count({ where: { status: 'pending' } }),
      this.repository.count({ where: { status: 'resolved' } }),
      this.repository.count({ where: { status: 'ignored' } }),
    ]);

    return {
      pending,
      resolved,
      ignored,
      total: pending + resolved + ignored,
    };
  }
}
