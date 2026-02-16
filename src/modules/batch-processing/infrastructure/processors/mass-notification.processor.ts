import { Injectable, Logger } from '@nestjs/common';
import {
  IBatchProcessor,
  BatchProcessorResult,
} from '../../domain/interfaces/batch-processor.interface';
import { BatchJob } from '../../domain/entities/batch-job.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';
import { NotificationService } from '../../../notifications/application/services/notification.service';

interface MassNotificationPayload {
  userIds?: string[];
  userFilters?: {
    kycStatus?: string;
    country?: string;
    accountType?: string;
    registeredAfter?: string;
    registeredBefore?: string;
  };
  notification: {
    title: string;
    message: string;
    type: 'push' | 'email' | 'sms' | 'in_app';
    priority?: 'low' | 'normal' | 'high';
    metadata?: Record<string, any>;
  };
  sendAt?: string; // ISO timestamp for scheduled delivery
}

@Injectable()
export class MassNotificationProcessor implements IBatchProcessor {
  private readonly logger = new Logger(MassNotificationProcessor.name);

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  async process(job: BatchJob): Promise<BatchProcessorResult> {
    this.logger.log(`Processing mass notification job: ${job.id}`);

    const payload = job.payload as MassNotificationPayload;
    const results: BatchProcessorResult = {
      success: true,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      results: {
        sent: [],
        failed: [],
        skipped: [],
      },
    };

    // Get target users
    const targetUsers = await this.getTargetUsers(payload);

    for (const userId of targetUsers) {
      try {
        // Check if user has opted in for this notification type
        const canSend = await this.checkUserPreferences(
          userId,
          payload.notification.type,
        );

        if (!canSend) {
          results.skippedCount++;
          results.results.skipped.push(userId);
          continue;
        }

        // Send notification
        await this.sendNotification(userId, payload.notification);

        results.processedCount++;
        results.successCount++;
        results.results.sent.push(userId);
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${userId}: ${error.message}`,
        );
        results.processedCount++;
        results.failedCount++;
        results.errors.push({
          item: userId,
          error: error.message,
        });
        results.results.failed.push(userId);
      }
    }

    results.success = results.failedCount === 0;
    return results;
  }

  async validatePayload(payload: any): Promise<boolean> {
    const data = payload as MassNotificationPayload;

    if (!data.userIds && !data.userFilters) {
      throw new Error('Either userIds or userFilters must be provided');
    }

    if (
      !data.notification ||
      !data.notification.title ||
      !data.notification.message
    ) {
      throw new Error('Notification title and message are required');
    }

    if (!['push', 'email', 'sms', 'in_app'].includes(data.notification.type)) {
      throw new Error('Invalid notification type');
    }

    return true;
  }

  getEstimatedDuration(itemCount: number): number {
    // Estimate 0.5 seconds per notification
    return Math.ceil(itemCount * 0.5);
  }

  private async getTargetUsers(
    payload: MassNotificationPayload,
  ): Promise<string[]> {
    if (payload.userIds) {
      return payload.userIds;
    }

    // Build query based on filters
    if (payload.userFilters) {
      const qb = this.userRepository.createQueryBuilder('user');
      qb.select('user.id');

      // Only active users
      qb.where('user.status = :status', { status: 'active' });

      if (payload.userFilters.kycStatus) {
        qb.andWhere('user.kycStatus = :kycStatus', {
          kycStatus: payload.userFilters.kycStatus,
        });
      }

      if (payload.userFilters.country) {
        qb.andWhere('user.countryCode = :country', {
          country: payload.userFilters.country,
        });
      }

      if (payload.userFilters.accountType) {
        qb.andWhere('user.role = :role', {
          role: payload.userFilters.accountType,
        });
      }

      if (payload.userFilters.registeredAfter) {
        qb.andWhere('user.createdAt >= :registeredAfter', {
          registeredAfter: new Date(payload.userFilters.registeredAfter),
        });
      }

      if (payload.userFilters.registeredBefore) {
        qb.andWhere('user.createdAt <= :registeredBefore', {
          registeredBefore: new Date(payload.userFilters.registeredBefore),
        });
      }

      const users = await qb.getMany();
      return users.map((u) => u.id);
    }

    return [];
  }

  private async checkUserPreferences(
    userId: string,
    notificationType: string,
  ): Promise<boolean> {
    try {
      const preferences =
        await this.notificationService.getPreferences(userId);

      // Map notification type to preference channel
      const channelMap: Record<string, keyof typeof preferences.channels> = {
        push: 'push',
        email: 'email',
        sms: 'sms',
        in_app: 'inApp',
      };

      const channel = channelMap[notificationType];
      if (channel && preferences.channels[channel] === false) {
        return false;
      }

      // Check if marketing category is enabled (mass notifications are typically marketing)
      if (preferences.categories?.marketing === false) {
        return false;
      }

      return true;
    } catch {
      // If we can't fetch preferences, default to allowing
      return true;
    }
  }

  private async sendNotification(
    userId: string,
    notification: MassNotificationPayload['notification'],
  ): Promise<void> {
    await this.notificationService.send({
      userId,
      title: notification.title,
      body: notification.message,
      category: 'marketing',
      data: notification.metadata,
    });
  }
}
