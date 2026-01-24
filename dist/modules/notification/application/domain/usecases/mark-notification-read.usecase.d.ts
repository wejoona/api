import { NotificationRepository } from '@modules/notification/infrastructure/repositories/notification.repository';
export interface MarkNotificationReadParams {
    userId: string;
    notificationId: string;
}
export declare class MarkNotificationReadUseCase {
    private readonly notificationRepository;
    constructor(notificationRepository: NotificationRepository);
    execute(params: MarkNotificationReadParams): Promise<void>;
}
