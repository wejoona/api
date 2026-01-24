import { NotificationType, NotificationStatus } from '@modules/notification/infrastructure/orm-entities/notification.orm-entity';
export declare class NotificationResponse {
    id: string;
    type: NotificationType;
    status: NotificationStatus;
    title: string;
    body: string;
    data: Record<string, unknown>;
    referenceType: string | null;
    referenceId: string | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
    isUnread: boolean;
}
