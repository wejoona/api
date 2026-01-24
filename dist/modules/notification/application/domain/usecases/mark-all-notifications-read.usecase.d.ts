import { NotificationRepository } from '@modules/notification/infrastructure/repositories/notification.repository';
export interface MarkAllNotificationsReadParams {
    userId: string;
}
export declare class MarkAllNotificationsReadUseCase {
    private readonly notificationRepository;
    constructor(notificationRepository: NotificationRepository);
    execute(params: MarkAllNotificationsReadParams): Promise<void>;
}
