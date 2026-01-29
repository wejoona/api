import { AuthenticatedRequest } from '../../../../common/guards';
import { GetUserNotificationsUseCase, MarkNotificationReadUseCase, MarkAllNotificationsReadUseCase, RegisterDeviceTokenUseCase, UnregisterDeviceTokenUseCase, UnregisterAllDeviceTokensUseCase, GetUnreadCountUseCase } from '../domain/usecases';
import { RegisterDeviceTokenRequest, GetNotificationsRequest, RegisterFcmTokenRequest, RemoveFcmTokenRequest } from '../dto/requests';
import { NotificationListResponse, UnreadCountResponse } from '../dto/responses';
export declare class NotificationController {
    private readonly getUserNotificationsUseCase;
    private readonly markNotificationReadUseCase;
    private readonly markAllNotificationsReadUseCase;
    private readonly registerDeviceTokenUseCase;
    private readonly unregisterDeviceTokenUseCase;
    private readonly unregisterAllDeviceTokensUseCase;
    private readonly getUnreadCountUseCase;
    constructor(getUserNotificationsUseCase: GetUserNotificationsUseCase, markNotificationReadUseCase: MarkNotificationReadUseCase, markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase, registerDeviceTokenUseCase: RegisterDeviceTokenUseCase, unregisterDeviceTokenUseCase: UnregisterDeviceTokenUseCase, unregisterAllDeviceTokensUseCase: UnregisterAllDeviceTokensUseCase, getUnreadCountUseCase: GetUnreadCountUseCase);
    getNotifications(req: AuthenticatedRequest, query: GetNotificationsRequest): Promise<NotificationListResponse>;
    getUnreadCount(req: AuthenticatedRequest): Promise<UnreadCountResponse>;
    markAsRead(req: AuthenticatedRequest, notificationId: string): Promise<void>;
    markAllAsRead(req: AuthenticatedRequest): Promise<void>;
    registerDeviceToken(req: AuthenticatedRequest, body: RegisterDeviceTokenRequest): Promise<{
        message: string;
    }>;
    unregisterDeviceToken(token: string): Promise<void>;
    registerPushToken(req: AuthenticatedRequest, body: RegisterFcmTokenRequest): Promise<{
        message: string;
    }>;
    removePushToken(body: RemoveFcmTokenRequest): Promise<void>;
    removeAllPushTokens(req: AuthenticatedRequest): Promise<void>;
}
