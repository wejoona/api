import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WithdrawalCompletedEvent, WithdrawalFailedEvent } from '../../domain/events/withdrawal.events';
import { NtmClientService } from '@modules/shared/infrastructure/services';

@Injectable()
export class WithdrawalCompletedListener {
  private readonly logger = new Logger(WithdrawalCompletedListener.name);

  constructor(private readonly ntmClient: NtmClientService) {}

  @OnEvent('withdrawal.completed')
  async handleWithdrawalCompleted(event: WithdrawalCompletedEvent): Promise<void> {
    this.logger.log(`Processing withdrawal completed event for ${event.withdrawalId}`);

    try {
      await this.ntmClient.send({
        template: 'withdrawal.completed',
        channel: 'push',
        recipient: { userId: event.userId },
        variables: {
          withdrawalId: event.withdrawalId,
          amount: (Number(event.amount) / 100).toFixed(2),
          fiatAmount: (Number(event.fiatAmount) / 100).toFixed(0),
          currency: event.currency,
          provider: event.providerCode,
        },
        priority: 'high',
      }).catch(err => {
        this.logger.warn(`NTM push failed for withdrawal ${event.withdrawalId}: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to process withdrawal completed event: ${error}`);
    }
  }

  @OnEvent('withdrawal.failed')
  async handleWithdrawalFailed(event: WithdrawalFailedEvent): Promise<void> {
    this.logger.log(`Processing withdrawal failed event for ${event.withdrawalId}`);

    try {
      await this.ntmClient.send({
        template: 'withdrawal.failed',
        channel: 'push',
        recipient: { userId: event.userId },
        variables: {
          withdrawalId: event.withdrawalId,
          reason: event.reason || 'Unknown error',
          provider: event.providerCode,
        },
        priority: 'normal',
      }).catch(err => {
        this.logger.warn(`NTM push failed for failed withdrawal ${event.withdrawalId}: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to process withdrawal failed event: ${error}`);
    }
  }
}
