import { NotificationRepository } from '@modules/notification/infrastructure/repositories/notification.repository';
import { UnreadCountResponse } from '../../dto/responses/unread-count.response';
export interface GetUnreadCountParams {
    userId: string;
}
export declare class GetUnreadCountUseCase {
    private readonly notificationRepository;
    constructor(notificationRepository: NotificationRepository);
    execute(params: GetUnreadCountParams): Promise<UnreadCountResponse>;
}
