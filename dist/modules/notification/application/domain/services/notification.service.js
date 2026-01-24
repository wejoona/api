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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const push_gateway_1 = require("../../../../shared/domain/gateways/push.gateway");
const device_token_repository_1 = require("../../../infrastructure/repositories/device-token.repository");
const notification_repository_1 = require("../../../infrastructure/repositories/notification.repository");
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(pushGateway, deviceTokenRepository, notificationRepository) {
        this.pushGateway = pushGateway;
        this.deviceTokenRepository = deviceTokenRepository;
        this.notificationRepository = notificationRepository;
        this.logger = new common_1.Logger(NotificationService_1.name);
    }
    async sendToUser(params) {
        const notification = await this.notificationRepository.create({
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            data: params.data,
            referenceType: params.referenceType,
            referenceId: params.referenceId,
        });
        this.logger.log(`Created notification ${notification.id} for user ${params.userId}`);
        const deviceTokens = await this.deviceTokenRepository.findActiveByUserId(params.userId);
        if (deviceTokens.length === 0) {
            this.logger.log(`No active device tokens for user ${params.userId}`);
            return {
                notificationId: notification.id,
                pushSent: false,
                devicesNotified: 0,
            };
        }
        const tokens = deviceTokens.map((dt) => dt.token);
        let successCount = 0;
        if (tokens.length === 1) {
            const request = {
                deviceToken: tokens[0],
                title: params.title,
                body: params.body,
                data: params.data,
                priority: params.priority ?? 'normal',
            };
            const result = await this.pushGateway.send(request);
            successCount = result.success ? 1 : 0;
            if (!result.success) {
                this.logger.warn(`Push notification failed for token: ${result.failureReason}`);
                if (result.failureReason?.includes('invalid') ||
                    result.failureReason?.includes('unregistered')) {
                    await this.deviceTokenRepository.deactivateToken(tokens[0]);
                }
            }
        }
        else {
            const result = await this.pushGateway.sendMulticast({
                deviceTokens: tokens,
                title: params.title,
                body: params.body,
                data: params.data,
                priority: params.priority ?? 'normal',
            });
            successCount = result.successCount;
            for (const response of result.responses) {
                if (!response.success &&
                    (response.failureReason?.includes('invalid') ||
                        response.failureReason?.includes('unregistered'))) {
                    await this.deviceTokenRepository.deactivateToken(response.deviceToken);
                }
            }
        }
        if (successCount > 0) {
            await this.notificationRepository.markAsSent(notification.id);
            this.logger.log(`Push notification sent to ${successCount}/${tokens.length} devices`);
        }
        else {
            await this.notificationRepository.markAsFailed(notification.id);
            this.logger.warn(`Failed to send push notification to any device`);
        }
        return {
            notificationId: notification.id,
            pushSent: successCount > 0,
            devicesNotified: successCount,
        };
    }
    async sendToTopic(topic, title, body, data) {
        return this.pushGateway.sendToTopic(topic, title, body, data);
    }
    async registerDeviceToken(userId, token, platform, deviceId, deviceName) {
        await this.deviceTokenRepository.upsert(userId, token, platform, deviceId, deviceName);
        this.logger.log(`Registered device token for user ${userId}`);
    }
    async unregisterDeviceToken(token) {
        await this.deviceTokenRepository.deactivateToken(token);
        this.logger.log(`Deactivated device token`);
    }
    async getUserNotifications(userId, options) {
        return this.notificationRepository.findByUserId(userId, options);
    }
    async markAsRead(notificationId) {
        await this.notificationRepository.markAsRead(notificationId);
    }
    async markAllAsRead(userId) {
        await this.notificationRepository.markAllAsRead(userId);
    }
    async getUnreadCount(userId) {
        return this.notificationRepository.countUnread(userId);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(push_gateway_1.PUSH_GATEWAY)),
    __param(1, (0, common_1.Inject)(device_token_repository_1.DEVICE_TOKEN_REPOSITORY)),
    __param(2, (0, common_1.Inject)(notification_repository_1.NOTIFICATION_REPOSITORY)),
    __metadata("design:paramtypes", [Object, device_token_repository_1.DeviceTokenRepository,
        notification_repository_1.NotificationRepository])
], NotificationService);
//# sourceMappingURL=notification.service.js.map