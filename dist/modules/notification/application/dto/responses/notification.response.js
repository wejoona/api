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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
class NotificationResponse {
}
exports.NotificationResponse = NotificationResponse;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    __metadata("design:type", String)
], NotificationResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification type',
        enum: [
            'transfer_received',
            'transfer_sent',
            'transfer_failed',
            'deposit_completed',
            'deposit_failed',
            'withdrawal_completed',
            'withdrawal_failed',
            'kyc_approved',
            'kyc_rejected',
            'low_balance',
            'system',
            'promotional',
        ],
        example: 'transfer_received',
    }),
    __metadata("design:type", String)
], NotificationResponse.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification status',
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        example: 'sent',
    }),
    __metadata("design:type", String)
], NotificationResponse.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification title',
        example: 'Payment Received',
    }),
    __metadata("design:type", String)
], NotificationResponse.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification body',
        example: 'You received $50.00 from John Doe',
    }),
    __metadata("design:type", String)
], NotificationResponse.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Additional notification data',
        example: { amount: '50.00', sender: 'John Doe' },
    }),
    __metadata("design:type", Object)
], NotificationResponse.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reference type (e.g., transaction, wallet)',
        example: 'transaction',
    }),
    __metadata("design:type", Object)
], NotificationResponse.prototype, "referenceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reference ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    __metadata("design:type", Object)
], NotificationResponse.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'When notification was sent',
        example: '2026-01-23T10:30:00.000Z',
    }),
    __metadata("design:type", Object)
], NotificationResponse.prototype, "sentAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'When notification was delivered',
        example: '2026-01-23T10:30:05.000Z',
    }),
    __metadata("design:type", Object)
], NotificationResponse.prototype, "deliveredAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'When notification was read',
        example: '2026-01-23T10:35:00.000Z',
    }),
    __metadata("design:type", Object)
], NotificationResponse.prototype, "readAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When notification was created',
        example: '2026-01-23T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], NotificationResponse.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether notification is unread',
        example: false,
    }),
    __metadata("design:type", Boolean)
], NotificationResponse.prototype, "isUnread", void 0);
//# sourceMappingURL=notification.response.js.map