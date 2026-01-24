import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/notification.repository';

export interface MarkNotificationReadParams {
  userId: string;
  notificationId: string;
}

/**
 * Mark Notification Read Use Case
 *
 * Marks a single notification as read.
 * Validates that the notification belongs to the user.
 */
@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(params: MarkNotificationReadParams): Promise<void> {
    // Fetch notification to verify ownership
    const notification = await this.notificationRepository.findById(
      params.notificationId,
    );

    if (!notification) {
      throw new NotFoundException(
        `Notification ${params.notificationId} not found`,
      );
    }

    // Verify ownership
    if (notification.userId !== params.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this notification',
      );
    }

    // Mark as read (idempotent - safe to call multiple times)
    if (notification.readAt === null) {
      await this.notificationRepository.markAsRead(params.notificationId);
    }
  }
}
