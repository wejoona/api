import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeadletterOrmEntity } from '../orm-entities/webhook-deadletter.orm-entity';

/**
 * Webhook Dead-Letter Repository
 *
 * Provides data access methods for webhook dead-letter queue management.
 * This repository encapsulates all database operations for failed webhooks.
 */
@Injectable()
export class WebhookDeadletterRepository {
  constructor(
    @InjectRepository(WebhookDeadletterOrmEntity)
    private readonly repository: Repository<WebhookDeadletterOrmEntity>,
  ) {}

  /**
   * Create a new dead-letter entry
   */
  async create(
    data: Partial<WebhookDeadletterOrmEntity>,
  ): Promise<WebhookDeadletterOrmEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Find a dead-letter entry by ID
   */
  async findById(id: string): Promise<WebhookDeadletterOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Find all dead-letter entries with optional filters
   */
  async findAll(filters?: {
    status?: 'pending' | 'resolved' | 'ignored';
    provider?: string;
  }): Promise<WebhookDeadletterOrmEntity[]> {
    const query = this.repository.createQueryBuilder('deadletter');

    if (filters?.status) {
      query.andWhere('deadletter.status = :status', { status: filters.status });
    }

    if (filters?.provider) {
      query.andWhere('deadletter.provider = :provider', {
        provider: filters.provider,
      });
    }

    return query.orderBy('deadletter.createdAt', 'DESC').getMany();
  }

  /**
   * Find all pending dead-letter entries
   */
  async findPending(provider?: string): Promise<WebhookDeadletterOrmEntity[]> {
    const where: any = { status: 'pending' };
    if (provider) {
      where.provider = provider;
    }

    return this.repository.find({
      where,
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
   * Update a dead-letter entry
   */
  async update(
    id: string,
    data: Partial<WebhookDeadletterOrmEntity>,
  ): Promise<void> {
    await this.repository.update(id, data);
  }

  /**
   * Mark a dead-letter entry as resolved
   */
  async markResolved(
    id: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<void> {
    await this.repository.update(id, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNotes: notes || null,
    });
  }

  /**
   * Mark a dead-letter entry as ignored
   */
  async markIgnored(
    id: string,
    ignoredBy: string,
    reason?: string,
  ): Promise<void> {
    await this.repository.update(id, {
      status: 'ignored',
      resolvedAt: new Date(),
      resolvedBy: ignoredBy,
      resolutionNotes: reason || null,
    });
  }

  /**
   * Increment retry count for a dead-letter entry
   */
  async incrementRetryCount(id: string): Promise<void> {
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

  /**
   * Delete old resolved/ignored entries (cleanup)
   */
  async deleteOldEntries(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', { statuses: ['resolved', 'ignored'] })
      .andWhere('resolvedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
