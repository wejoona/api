import { Repository } from 'typeorm';
import { NotificationOrmEntity, NotificationType } from '../orm-entities/notification.orm-entity';
export declare const NOTIFICATION_REPOSITORY: unique symbol;
export interface INotificationRepository {
    findByUserId(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<NotificationOrmEntity[]>;
    findUnreadByUserId(userId: string): Promise<NotificationOrmEntity[]>;
    findById(id: string): Promise<NotificationOrmEntity | null>;
    save(notification: Partial<NotificationOrmEntity>): Promise<NotificationOrmEntity>;
    markAsRead(id: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    countUnread(userId: string): Promise<number>;
}
export declare class NotificationRepository implements INotificationRepository {
    private readonly repository;
    constructor(repository: Repository<NotificationOrmEntity>);
    findByUserId(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<NotificationOrmEntity[]>;
    findUnreadByUserId(userId: string): Promise<NotificationOrmEntity[]>;
    findById(id: string): Promise<NotificationOrmEntity | null>;
    save(notification: Partial<NotificationOrmEntity>): Promise<NotificationOrmEntity>;
    create(params: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        data?: Record<string, unknown>;
        referenceType?: string;
        referenceId?: string;
    }): Promise<NotificationOrmEntity>;
    markAsSent(id: string): Promise<void>;
    markAsDelivered(id: string): Promise<void>;
    markAsRead(id: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    markAsFailed(id: string): Promise<void>;
    countUnread(userId: string): Promise<number>;
    deleteOlderThan(days: number): Promise<number>;
}
