export declare class BalanceMonitorTriggeredEvent {
    readonly monitorId: string;
    readonly monitorType: 'LOW_BALANCE_WARNING' | 'HIGH_DEBIT_ALERT' | 'AML_DAILY_LIMIT' | 'LOW_FLOAT_ALERT';
    readonly balanceId: string;
    readonly userId: string;
    readonly currentValue: bigint;
    readonly threshold: bigint;
    readonly triggeredAt: Date;
    readonly metadata?: Record<string, unknown> | undefined;
    constructor(monitorId: string, monitorType: 'LOW_BALANCE_WARNING' | 'HIGH_DEBIT_ALERT' | 'AML_DAILY_LIMIT' | 'LOW_FLOAT_ALERT', balanceId: string, userId: string, currentValue: bigint, threshold: bigint, triggeredAt: Date, metadata?: Record<string, unknown> | undefined);
}
