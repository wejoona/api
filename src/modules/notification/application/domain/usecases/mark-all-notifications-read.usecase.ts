import { Injectable, Inject } from '@nestjs/common';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/notification.repository';

export interface MarkAllNotificationsReadParams {
  userId: string;
}

/**
 * Mark All Notifications Read Use Case
 *
 * Marks all unread notifications as read for a user.
 */
@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(params: MarkAllNotificationsReadParams): Promise<void> {
    await this.notificationRepository.markAllAsRead(params.userId);
  }
}
