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
exports.Repositories = void 0;
const device_token_repository_1 = require("./device-token.repository");
const notification_repository_1 = require("./notification.repository");
__exportStar(require("./device-token.repository"), exports);
__exportStar(require("./notification.repository"), exports);
exports.Repositories = [
    device_token_repository_1.DeviceTokenRepository,
    {
        provide: device_token_repository_1.DEVICE_TOKEN_REPOSITORY,
        useExisting: device_token_repository_1.DeviceTokenRepository,
    },
    notification_repository_1.NotificationRepository,
    {
        provide: notification_repository_1.NOTIFICATION_REPOSITORY,
        useExisting: notification_repository_1.NotificationRepository,
    },
];
//# sourceMappingURL=index.js.map