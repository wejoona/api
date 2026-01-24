"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceMonitorTriggeredEvent = void 0;
class BalanceMonitorTriggeredEvent {
    constructor(monitorId, monitorType, balanceId, userId, currentValue, threshold, triggeredAt, metadata) {
        this.monitorId = monitorId;
        this.monitorType = monitorType;
        this.balanceId = balanceId;
        this.userId = userId;
        this.currentValue = currentValue;
        this.threshold = threshold;
        this.triggeredAt = triggeredAt;
        this.metadata = metadata;
    }
}
exports.BalanceMonitorTriggeredEvent = BalanceMonitorTriggeredEvent;
//# sourceMappingURL=balance-monitor-triggered.event.js.map