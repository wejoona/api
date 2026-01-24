import { Injectable, Inject } from '@nestjs/common';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/notification.repository';
import { NotificationResponse } from '../../dto/responses/notification.response';
import { NotificationListResponse } from '../../dto/responses/notification-list.response';

export interface GetUserNotificationsParams {
  userId: string;
  limit?: number;
  offset?: number;
}

/**
 * Get User Notifications Use Case
 *
 * Retrieves paginated list of notifications for a user
 * along with total count and unread count.
 */
@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    params: GetUserNotificationsParams,
  ): Promise<NotificationListResponse> {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    // Fetch notifications
    const notifications = await this.notificationRepository.findByUserId(
      params.userId,
      { limit, offset },
    );

    // Get unread count
    const unreadCount = await this.notificationRepository.countUnread(
      params.userId,
    );

    // Get total count (this could be optimized with a separate count query if needed)
    // For now, we'll use the unread count + read count estimation
    // In production, you might want to add a countAll method to the repository
    const allNotifications = await this.notificationRepository.findByUserId(
      params.userId,
      { limit: 1000, offset: 0 },
    );
    const total = allNotifications.length;

    // Map to response DTOs
    const notificationResponses: NotificationResponse[] = notifications.map(
      (notification) => ({
        id: notification.id,
        type: notification.type,
        status: notification.status,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        referenceType: notification.referenceType,
        referenceId: notification.referenceId,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        isUnread: notification.readAt === null,
      }),
    );

    return {
      notifications: notificationResponses,
      total,
      unreadCount,
      limit,
      offset,
    };
  }
}
