"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UseCases = void 0;
__exportStar(require("./get-user-notifications.usecase"), exports);
__exportStar(require("./mark-notification-read.usecase"), exports);
__exportStar(require("./mark-all-notifications-read.usecase"), exports);
__exportStar(require("./register-device-token.usecase"), exports);
__exportStar(require("./unregister-device-token.usecase"), exports);
__exportStar(require("./unregister-all-device-tokens.usecase"), exports);
__exportStar(require("./get-unread-count.usecase"), exports);
const get_user_notifications_usecase_1 = require("./get-user-notifications.usecase");
const mark_notification_read_usecase_1 = require("./mark-notification-read.usecase");
const mark_all_notifications_read_usecase_1 = require("./mark-all-notifications-read.usecase");
const register_device_token_usecase_1 = require("./register-device-token.usecase");
const unregister_device_token_usecase_1 = require("./unregister-device-token.usecase");
const unregister_all_device_tokens_usecase_1 = require("./unregister-all-device-tokens.usecase");
const get_unread_count_usecase_1 = require("./get-unread-count.usecase");
exports.UseCases = [
    get_user_notifications_usecase_1.GetUserNotificationsUseCase,
    mark_notification_read_usecase_1.MarkNotificationReadUseCase,
    mark_all_notifications_read_usecase_1.MarkAllNotificationsReadUseCase,
    register_device_token_usecase_1.RegisterDeviceTokenUseCase,
    unregister_device_token_usecase_1.UnregisterDeviceTokenUseCase,
    unregister_all_device_tokens_usecase_1.UnregisterAllDeviceTokensUseCase,
    get_unread_count_usecase_1.GetUnreadCountUseCase,
];
//# sourceMappingURL=index.js.map