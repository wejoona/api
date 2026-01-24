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
exports.NotificationListResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
const notification_response_1 = require("./notification.response");
class NotificationListResponse {
}
exports.NotificationListResponse = NotificationListResponse;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'List of notifications',
        type: [notification_response_1.NotificationResponse],
    }),
    __metadata("design:type", Array)
], NotificationListResponse.prototype, "notifications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of notifications',
        example: 42,
    }),
    __metadata("design:type", Number)
], NotificationListResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of unread notifications',
        example: 5,
    }),
    __metadata("design:type", Number)
], NotificationListResponse.prototype, "unreadCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Limit used for pagination',
        example: 20,
    }),
    __metadata("design:type", Number)
], NotificationListResponse.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Offset used for pagination',
        example: 0,
    }),
    __metadata("design:type", Number)
], NotificationListResponse.prototype, "offset", void 0);
//# sourceMappingURL=notification-list.response.js.map