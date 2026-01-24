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
exports.Services = void 0;
const balance_monitor_handler_service_1 = require("./balance-monitor-handler.service");
const notification_service_1 = require("./notification.service");
__exportStar(require("./balance-monitor-handler.service"), exports);
__exportStar(require("./notification.service"), exports);
exports.Services = [
    notification_service_1.NotificationService,
    balance_monitor_handler_service_1.BalanceMonitorHandlerService,
];
//# sourceMappingURL=index.js.map