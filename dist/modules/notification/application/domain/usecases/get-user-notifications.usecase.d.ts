import { NotificationRepository } from '@modules/notification/infrastructure/repositories/notification.repository';
import { NotificationListResponse } from '../../dto/responses/notification-list.response';
export interface GetUserNotificationsParams {
    userId: string;
    limit?: number;
    offset?: number;
}
export declare class GetUserNotificationsUseCase {
    private readonly notificationRepository;
    constructor(notificationRepository: NotificationRepository);
    execute(params: GetUserNotificationsParams): Promise<NotificationListResponse>;
}
