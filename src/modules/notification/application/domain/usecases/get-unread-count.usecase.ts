import { Injectable, Inject } from '@nestjs/common';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/notification.repository';
import { UnreadCountResponse } from '../../dto/responses/unread-count.response';

export interface GetUnreadCountParams {
  userId: string;
}

/**
 * Get Unread Count Use Case
 *
 * Retrieves the count of unread notifications for a user.
 */
@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(params: GetUnreadCountParams): Promise<UnreadCountResponse> {
    const count = await this.notificationRepository.countUnread(params.userId);

    return { count };
  }
}
