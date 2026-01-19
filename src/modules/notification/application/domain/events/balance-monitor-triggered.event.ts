/**
 * Balance Monitor Triggered Event
 *
 * Emitted when a balance monitor condition is met:
 * - LOW_BALANCE_WARNING: User balance fell below threshold
 * - HIGH_DEBIT_ALERT: High debit volume detected (fraud alert)
 * - AML_DAILY_LIMIT: Daily transaction limit reached (compliance)
 * - LOW_FLOAT_ALERT: Operational float is low (ops team)
 */
export class BalanceMonitorTriggeredEvent {
  constructor(
    public readonly monitorId: string,
    public readonly monitorType:
      | 'LOW_BALANCE_WARNING'
      | 'HIGH_DEBIT_ALERT'
      | 'AML_DAILY_LIMIT'
      | 'LOW_FLOAT_ALERT',
    public readonly balanceId: string,
    public readonly userId: string,
    public readonly currentValue: bigint,
    public readonly threshold: bigint,
    public readonly triggeredAt: Date,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
