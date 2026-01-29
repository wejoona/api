"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const guards_1 = require("../../../../common/guards");
const usecases_1 = require("../domain/usecases");
const requests_1 = require("../dto/requests");
const responses_1 = require("../dto/responses");
let NotificationController = class NotificationController {
    constructor(getUserNotificationsUseCase, markNotificationReadUseCase, markAllNotificationsReadUseCase, registerDeviceTokenUseCase, unregisterDeviceTokenUseCase, unregisterAllDeviceTokensUseCase, getUnreadCountUseCase) {
        this.getUserNotificationsUseCase = getUserNotificationsUseCase;
        this.markNotificationReadUseCase = markNotificationReadUseCase;
        this.markAllNotificationsReadUseCase = markAllNotificationsReadUseCase;
        this.registerDeviceTokenUseCase = registerDeviceTokenUseCase;
        this.unregisterDeviceTokenUseCase = unregisterDeviceTokenUseCase;
        this.unregisterAllDeviceTokensUseCase = unregisterAllDeviceTokensUseCase;
        this.getUnreadCountUseCase = getUnreadCountUseCase;
    }
    async getNotifications(req, query) {
        return this.getUserNotificationsUseCase.execute({
            userId: req.user.id,
            limit: query.limit,
            offset: query.offset,
        });
    }
    async getUnreadCount(req) {
        return this.getUnreadCountUseCase.execute({
            userId: req.user.id,
        });
    }
    async markAsRead(req, notificationId) {
        await this.markNotificationReadUseCase.execute({
            userId: req.user.id,
            notificationId,
        });
    }
    async markAllAsRead(req) {
        await this.markAllNotificationsReadUseCase.execute({
            userId: req.user.id,
        });
    }
    async registerDeviceToken(req, body) {
        await this.registerDeviceTokenUseCase.execute({
            userId: req.user.id,
            token: body.token,
            platform: body.platform,
            deviceId: body.deviceId,
            deviceName: body.deviceName,
        });
        return {
            message: 'Device token registered successfully',
        };
    }
    async unregisterDeviceToken(token) {
        await this.unregisterDeviceTokenUseCase.execute({ token });
    }
    async registerPushToken(req, body) {
        await this.registerDeviceTokenUseCase.execute({
            userId: req.user.id,
            token: body.token,
            platform: body.platform,
            deviceId: body.deviceId,
            deviceName: body.deviceName,
        });
        return {
            message: 'Push token registered successfully',
        };
    }
    async removePushToken(body) {
        await this.unregisterDeviceTokenUseCase.execute({ token: body.token });
    }
    async removeAllPushTokens(req) {
        await this.unregisterAllDeviceTokensUseCase.execute({
            userId: req.user.id,
        });
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user notifications (paginated)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns paginated list of notifications',
        type: responses_1.NotificationListResponse,
        schema: {
            example: {
                notifications: [
                    {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        type: 'transfer_received',
                        status: 'sent',
                        title: 'Payment Received',
                        body: 'You received $50.00 from John Doe',
                        data: { amount: '50.00', sender: 'John Doe' },
                        referenceType: 'transaction',
                        referenceId: '123e4567-e89b-12d3-a456-426614174001',
                        sentAt: '2026-01-23T10:30:00.000Z',
                        deliveredAt: '2026-01-23T10:30:05.000Z',
                        readAt: null,
                        createdAt: '2026-01-23T10:30:00.000Z',
                        isUnread: true,
                    },
                ],
                total: 42,
                unreadCount: 5,
                limit: 20,
                offset: 0,
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.GetNotificationsRequest]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('unread/count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread notification count' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns count of unread notifications',
        type: responses_1.UnreadCountResponse,
        schema: {
            example: {
                count: 5,
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Mark notification as read' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Notification ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Notification marked as read',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Notification not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - notification does not belong to user',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)('read-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all notifications as read' }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'All notifications marked as read',
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Post)('device-token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register device token for push notifications' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Device token registered successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid request data',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.RegisterDeviceTokenRequest]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "registerDeviceToken", null);
__decorate([
    (0, common_1.Delete)('device-token/:token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Unregister device token' }),
    (0, swagger_1.ApiParam)({
        name: 'token',
        description: 'Device token to unregister',
        example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Device token unregistered successfully',
    }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "unregisterDeviceToken", null);
__decorate([
    (0, common_1.Post)('push/token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register FCM push token (mobile SDK compatible)' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'FCM token registered successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid request data',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.RegisterFcmTokenRequest]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "registerPushToken", null);
__decorate([
    (0, common_1.Delete)('push/token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Remove a specific FCM push token (mobile SDK compatible)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'FCM token removed successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid request data',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.RemoveFcmTokenRequest]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "removePushToken", null);
__decorate([
    (0, common_1.Delete)('push/tokens'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Remove all FCM push tokens for current user (mobile SDK compatible)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'All FCM tokens removed successfully',
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "removeAllPushTokens", null);
exports.NotificationController = NotificationController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [usecases_1.GetUserNotificationsUseCase,
        usecases_1.MarkNotificationReadUseCase,
        usecases_1.MarkAllNotificationsReadUseCase,
        usecases_1.RegisterDeviceTokenUseCase,
        usecases_1.UnregisterDeviceTokenUseCase,
        usecases_1.UnregisterAllDeviceTokensUseCase,
        usecases_1.GetUnreadCountUseCase])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map