import { BalanceMonitorTriggeredEvent } from '../events/balance-monitor-triggered.event';
import { NotificationService } from './notification.service';
export declare class BalanceMonitorHandlerService {
    private readonly notificationService;
    private readonly logger;
    private readonly FRAUD_TEAM_TOPIC;
    private readonly COMPLIANCE_TEAM_TOPIC;
    private readonly OPERATIONS_TEAM_TOPIC;
    private readonly FINANCE_TEAM_TOPIC;
    constructor(notificationService: NotificationService);
    handleUserLedgerIdentityCreated(payload: {
        userId: string;
        identityId: string;
        balanceId: string;
        email: string;
        timestamp: string;
    }): void;
    handleBalanceMonitorsSetup(payload: {
        userId: string;
        balanceId: string;
        monitors: {
            type: string;
            monitorId: string;
        }[];
        timestamp: string;
    }): void;
    handleLowBalanceWarning(event: BalanceMonitorTriggeredEvent): Promise<void>;
    handleHighDebitAlert(event: BalanceMonitorTriggeredEvent): Promise<void>;
    handleAmlLimit(event: BalanceMonitorTriggeredEvent): Promise<void>;
    handleLowFloatAlert(event: BalanceMonitorTriggeredEvent): Promise<void>;
    handleReconciliationCompleted(payload: {
        source: string;
        reconciliationId: string;
        matchedCount: number;
        unmatchedCount: number;
    }): Promise<void>;
    handleReconciliationDiscrepancy(payload: {
        source: string;
        reconciliationId: string;
        unmatchedCount: number;
        message: string;
    }): Promise<void>;
    handleReconciliationFailed(payload: {
        source: string;
        error: string;
        timestamp: string;
    }): Promise<void>;
    private formatAmount;
}
