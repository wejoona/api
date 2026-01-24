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
var BalanceMonitorHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceMonitorHandlerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const balance_monitor_triggered_event_1 = require("../events/balance-monitor-triggered.event");
const notification_service_1 = require("./notification.service");
let BalanceMonitorHandlerService = BalanceMonitorHandlerService_1 = class BalanceMonitorHandlerService {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(BalanceMonitorHandlerService_1.name);
        this.FRAUD_TEAM_TOPIC = 'fraud_team_alerts';
        this.COMPLIANCE_TEAM_TOPIC = 'compliance_team_alerts';
        this.OPERATIONS_TEAM_TOPIC = 'operations_team_alerts';
        this.FINANCE_TEAM_TOPIC = 'finance_team_alerts';
    }
    handleUserLedgerIdentityCreated(payload) {
        this.logger.log(`User ledger identity created: ${payload.userId}`);
    }
    handleBalanceMonitorsSetup(payload) {
        this.logger.log(`Balance monitors setup for user ${payload.userId}: ${payload.monitors.length} monitors`);
    }
    async handleLowBalanceWarning(event) {
        this.logger.warn(`Low balance alert for user: ${event.userId}`);
        try {
            const currentBalance = this.formatAmount(event.currentValue);
            const threshold = this.formatAmount(event.threshold);
            const result = await this.notificationService.sendToUser({
                userId: event.userId,
                type: 'low_balance',
                title: 'Low Balance Alert',
                body: `Your balance of ${currentBalance} USDC is below ${threshold} USDC. Consider topping up your wallet.`,
                data: {
                    type: 'low_balance',
                    balanceId: event.balanceId,
                    currentBalance: currentBalance,
                    threshold: threshold,
                },
                referenceType: 'balance_monitor',
                referenceId: event.monitorId,
                priority: 'normal',
            });
            this.logger.log(`Low balance notification sent: ${result.notificationId}, pushed to ${result.devicesNotified} devices`);
        }
        catch (error) {
            this.logger.error(`Failed to send low balance notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleHighDebitAlert(event) {
        this.logger.error(`HIGH DEBIT ALERT for user: ${event.userId}`);
        try {
            const debitAmount = this.formatAmount(event.currentValue);
            const threshold = this.formatAmount(event.threshold);
            await this.notificationService.sendToTopic(this.FRAUD_TEAM_TOPIC, 'High Debit Alert - Review Required', `User ${event.userId} has high debit activity: ${debitAmount} USDC (threshold: ${threshold} USDC)`, {
                type: 'high_debit_alert',
                userId: event.userId,
                balanceId: event.balanceId,
                amount: debitAmount,
                threshold: threshold,
                triggeredAt: event.triggeredAt.toISOString(),
            });
            await this.notificationService.sendToUser({
                userId: event.userId,
                type: 'system',
                title: 'Security Alert',
                body: 'We noticed unusual activity on your account. Your recent transactions are being reviewed for security.',
                data: {
                    type: 'security_review',
                    reason: 'high_debit',
                },
                priority: 'high',
            });
            this.logger.log(`High debit alert notifications sent for user: ${event.userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to send high debit notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleAmlLimit(event) {
        this.logger.warn(`AML daily limit reached for user: ${event.userId}`);
        try {
            const currentAmount = this.formatAmount(event.currentValue);
            const limit = this.formatAmount(event.threshold);
            await this.notificationService.sendToTopic(this.COMPLIANCE_TEAM_TOPIC, 'AML Limit Reached', `User ${event.userId} reached daily AML limit: ${currentAmount} USDC (limit: ${limit} USDC)`, {
                type: 'aml_limit_reached',
                userId: event.userId,
                balanceId: event.balanceId,
                dailyTotal: currentAmount,
                limit: limit,
                triggeredAt: event.triggeredAt.toISOString(),
            });
            await this.notificationService.sendToUser({
                userId: event.userId,
                type: 'system',
                title: 'Daily Limit Reached',
                body: `You've reached your daily transaction limit of ${limit} USDC. Limits will reset tomorrow.`,
                data: {
                    type: 'aml_limit',
                    dailyTotal: currentAmount,
                    limit: limit,
                },
                priority: 'normal',
            });
            this.logger.log(`AML limit notifications sent for user: ${event.userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to send AML limit notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleLowFloatAlert(event) {
        this.logger.warn(`LOW FLOAT ALERT - Operations action required`);
        try {
            const currentFloat = this.formatAmount(event.currentValue);
            const threshold = this.formatAmount(event.threshold);
            await this.notificationService.sendToTopic(this.OPERATIONS_TEAM_TOPIC, 'Low Float Alert - Action Required', `Operational float is low: ${currentFloat} USDC (threshold: ${threshold} USDC). Replenishment needed.`, {
                type: 'low_float_alert',
                balanceId: event.balanceId,
                currentFloat: currentFloat,
                threshold: threshold,
                triggeredAt: event.triggeredAt.toISOString(),
            });
            this.logger.log(`Low float alert sent to operations team`);
        }
        catch (error) {
            this.logger.error(`Failed to send low float alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleReconciliationCompleted(payload) {
        this.logger.log(`Reconciliation completed for ${payload.source}: ${payload.matchedCount} matched, ${payload.unmatchedCount} unmatched`);
        if (payload.unmatchedCount > 0) {
            try {
                await this.notificationService.sendToTopic(this.FINANCE_TEAM_TOPIC, 'Reconciliation Discrepancy', `Reconciliation for ${payload.source} completed with ${payload.unmatchedCount} unmatched transactions.`, {
                    type: 'reconciliation_discrepancy',
                    source: payload.source,
                    reconciliationId: payload.reconciliationId,
                    matchedCount: payload.matchedCount.toString(),
                    unmatchedCount: payload.unmatchedCount.toString(),
                });
                this.logger.warn(`Sent discrepancy alert for ${payload.unmatchedCount} unmatched transactions`);
            }
            catch (error) {
                this.logger.error(`Failed to send reconciliation discrepancy alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    async handleReconciliationDiscrepancy(payload) {
        this.logger.error(`Reconciliation discrepancy: ${payload.message}`);
        try {
            await this.notificationService.sendToTopic(this.FINANCE_TEAM_TOPIC, 'Reconciliation Alert - Investigation Required', `${payload.message}. Source: ${payload.source}, Unmatched: ${payload.unmatchedCount}`, {
                type: 'reconciliation_alert',
                source: payload.source,
                reconciliationId: payload.reconciliationId,
                unmatchedCount: payload.unmatchedCount.toString(),
            });
        }
        catch (error) {
            this.logger.error(`Failed to send reconciliation discrepancy alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handleReconciliationFailed(payload) {
        this.logger.error(`Reconciliation failed for ${payload.source}: ${payload.error}`);
        try {
            await this.notificationService.sendToTopic(this.OPERATIONS_TEAM_TOPIC, 'Reconciliation Failed', `Reconciliation for ${payload.source} failed: ${payload.error}`, {
                type: 'reconciliation_failed',
                source: payload.source,
                error: payload.error,
                timestamp: payload.timestamp,
            });
        }
        catch (error) {
            this.logger.error(`Failed to send reconciliation failure alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    formatAmount(amount) {
        const divisor = BigInt(1000000);
        const whole = amount / divisor;
        const fraction = amount % divisor;
        const fractionStr = fraction.toString().padStart(6, '0').replace(/0+$/, '');
        if (fractionStr === '') {
            return whole.toString();
        }
        return `${whole}.${fractionStr}`;
    }
};
exports.BalanceMonitorHandlerService = BalanceMonitorHandlerService;
__decorate([
    (0, event_emitter_1.OnEvent)('user.ledger-identity.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BalanceMonitorHandlerService.prototype, "handleUserLedgerIdentityCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('user.balance-monitors.setup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BalanceMonitorHandlerService.prototype, "handleBalanceMonitorsSetup", null);
__decorate([
    (0, event_emitter_1.OnEvent)('balance.monitor.low_balance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [balance_monitor_triggered_event_1.BalanceMonitorTriggeredEvent]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleLowBalanceWarning", null);
__decorate([
    (0, event_emitter_1.OnEvent)('balance.monitor.high_debit'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [balance_monitor_triggered_event_1.BalanceMonitorTriggeredEvent]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleHighDebitAlert", null);
__decorate([
    (0, event_emitter_1.OnEvent)('balance.monitor.aml_limit'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [balance_monitor_triggered_event_1.BalanceMonitorTriggeredEvent]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleAmlLimit", null);
__decorate([
    (0, event_emitter_1.OnEvent)('balance.monitor.low_float'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [balance_monitor_triggered_event_1.BalanceMonitorTriggeredEvent]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleLowFloatAlert", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reconciliation.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleReconciliationCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reconciliation.discrepancy'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleReconciliationDiscrepancy", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reconciliation.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BalanceMonitorHandlerService.prototype, "handleReconciliationFailed", null);
exports.BalanceMonitorHandlerService = BalanceMonitorHandlerService = BalanceMonitorHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], BalanceMonitorHandlerService);
//# sourceMappingURL=balance-monitor-handler.service.js.map