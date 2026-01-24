import { IPushGateway } from '@modules/shared/domain/gateways/push.gateway';
import { DeviceTokenRepository } from '@modules/notification/infrastructure/repositories/device-token.repository';
import { NotificationRepository } from '@modules/notification/infrastructure/repositories/notification.repository';
import { NotificationType } from '@modules/notification/infrastructure/orm-entities/notification.orm-entity';
export interface SendNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
    referenceType?: string;
    referenceId?: string;
    priority?: 'high' | 'normal';
}
export declare class NotificationService {
    private readonly pushGateway;
    private readonly deviceTokenRepository;
    private readonly notificationRepository;
    private readonly logger;
    constructor(pushGateway: IPushGateway, deviceTokenRepository: DeviceTokenRepository, notificationRepository: NotificationRepository);
    sendToUser(params: SendNotificationParams): Promise<{
        notificationId: string;
        pushSent: boolean;
        devicesNotified: number;
    }>;
    sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<{
        messageId: string;
    }>;
    registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android' | 'web', deviceId?: string, deviceName?: string): Promise<void>;
    unregisterDeviceToken(token: string): Promise<void>;
    getUserNotifications(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<import("@modules/notification/infrastructure/orm-entities/notification.orm-entity").NotificationOrmEntity[]>;
    markAsRead(notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<number>;
}
