import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  BALANCE_MONITOR_PROVIDER,
  IBalanceMonitorProvider,
} from '@modules/providers/interfaces';
import { JOONAPAY_MONITORS } from '@modules/providers/blnk';

export interface SetupUserBalanceMonitorsInput {
  userId: string;
  balanceId: string;
  email?: string;
}

export interface SetupUserBalanceMonitorsOutput {
  monitors: {
    type: string;
    monitorId: string;
  }[];
}

/**
 * Setup User Balance Monitors Use Case
 *
 * Sets up balance monitors for a new user's account:
 * - Low balance warning (< $10 USDC)
 * - High debit alert (> $10,000 USDC) for fraud detection
 * - AML daily limit ($3,000 UEMOA compliance)
 *
 * Monitors trigger webhooks/events when conditions are met.
 */
@Injectable()
export class SetupUserBalanceMonitorsUseCase {
  private readonly logger = new Logger(SetupUserBalanceMonitorsUseCase.name);
  private readonly webhookBaseUrl: string;

  constructor(
    @Inject(BALANCE_MONITOR_PROVIDER)
    private readonly monitorProvider: IBalanceMonitorProvider,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.webhookBaseUrl = this.configService.get<string>(
      'app.webhookUrl',
      'http://localhost:3000',
    );
  }

  async execute(
    input: SetupUserBalanceMonitorsInput,
  ): Promise<SetupUserBalanceMonitorsOutput> {
    this.logger.log(`Setting up balance monitors for user: ${input.userId}`);

    const monitors: { type: string; monitorId: string }[] = [];

    // 1. Low Balance Warning Monitor
    try {
      const lowBalanceMonitor = await this.monitorProvider.createMonitor({
        balanceId: input.balanceId,
        field: JOONAPAY_MONITORS.LOW_BALANCE_WARNING.field,
        operator: JOONAPAY_MONITORS.LOW_BALANCE_WARNING.operator,
        value: BigInt(JOONAPAY_MONITORS.LOW_BALANCE_WARNING.value),
        description: `${JOONAPAY_MONITORS.LOW_BALANCE_WARNING.description} - User: ${input.userId}`,
      });

      monitors.push({
        type: 'LOW_BALANCE_WARNING',
        monitorId: lowBalanceMonitor.monitorId,
      });

      this.logger.debug(
        `Created low balance monitor: ${lowBalanceMonitor.monitorId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create low balance monitor: ${error}`);
    }

    // 2. High Debit Alert Monitor (Fraud Detection)
    try {
      const highDebitMonitor = await this.monitorProvider.createMonitor({
        balanceId: input.balanceId,
        field: JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.field,
        operator: JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.operator,
        value: BigInt(JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.value),
        description: `${JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.description} - User: ${input.userId}`,
      });

      monitors.push({
        type: 'HIGH_DEBIT_ALERT',
        monitorId: highDebitMonitor.monitorId,
      });

      this.logger.debug(
        `Created high debit monitor: ${highDebitMonitor.monitorId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create high debit monitor: ${error}`);
    }

    // 3. AML Daily Limit Monitor (Compliance)
    try {
      const amlMonitor = await this.monitorProvider.createMonitor({
        balanceId: input.balanceId,
        field: JOONAPAY_MONITORS.AML_DAILY_LIMIT.field,
        operator: JOONAPAY_MONITORS.AML_DAILY_LIMIT.operator,
        value: BigInt(JOONAPAY_MONITORS.AML_DAILY_LIMIT.value),
        description: `${JOONAPAY_MONITORS.AML_DAILY_LIMIT.description} - User: ${input.userId}`,
      });

      monitors.push({
        type: 'AML_DAILY_LIMIT',
        monitorId: amlMonitor.monitorId,
      });

      this.logger.debug(`Created AML limit monitor: ${amlMonitor.monitorId}`);
    } catch (error) {
      this.logger.error(`Failed to create AML limit monitor: ${error}`);
    }

    // Emit event
    this.eventEmitter.emit('user.balance-monitors.setup', {
      userId: input.userId,
      balanceId: input.balanceId,
      monitors,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Setup ${monitors.length} balance monitors for user: ${input.userId}`,
    );

    return { monitors };
  }
}
