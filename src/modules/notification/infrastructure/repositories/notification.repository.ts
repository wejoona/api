import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  NotificationOrmEntity,
  NotificationType,
  NotificationStatus,
} from '../orm-entities/notification.orm-entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface INotificationRepository {
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<NotificationOrmEntity[]>;
  findUnreadByUserId(userId: string): Promise<NotificationOrmEntity[]>;
  findById(id: string): Promise<NotificationOrmEntity | null>;
  save(
    notification: Partial<NotificationOrmEntity>,
  ): Promise<NotificationOrmEntity>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  countUnread(userId: string): Promise<number>;
}

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repository: Repository<NotificationOrmEntity>,
  ) {}

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<NotificationOrmEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  async findUnreadByUserId(userId: string): Promise<NotificationOrmEntity[]> {
    return this.repository.find({
      where: { userId, readAt: undefined },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<NotificationOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async save(
    notification: Partial<NotificationOrmEntity>,
  ): Promise<NotificationOrmEntity> {
    const entity = this.repository.create(notification);
    return this.repository.save(entity);
  }

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    referenceType?: string;
    referenceId?: string;
  }): Promise<NotificationOrmEntity> {
    return this.save({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      status: 'pending',
    });
  }

  async markAsSent(id: string): Promise<void> {
    await this.repository.update(id, {
      status: 'sent',
      sentAt: new Date(),
    });
  }

  async markAsDelivered(id: string): Promise<void> {
    await this.repository.update(id, {
      status: 'delivered',
      deliveredAt: new Date(),
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.repository.update(id, {
      status: 'read',
      readAt: new Date(),
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.update(
      { userId, readAt: undefined as unknown as null },
      { status: 'read', readAt: new Date() },
    );
  }

  async markAsFailed(id: string): Promise<void> {
    await this.repository.update(id, { status: 'failed' });
  }

  async countUnread(userId: string): Promise<number> {
    return this.repository.count({
      where: { userId, readAt: undefined as unknown as null },
    });
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.repository.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected ?? 0;
  }
}
