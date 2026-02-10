import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DepositCompletedEvent, DepositFailedEvent } from '../../domain/events/deposit.events';
import { NtmClientService } from '@modules/shared/infrastructure/services';

@Injectable()
export class DepositCompletedListener {
  private readonly logger = new Logger(DepositCompletedListener.name);

  constructor(private readonly ntmClient: NtmClientService) {}

  @OnEvent('deposit.completed')
  async handleDepositCompleted(event: DepositCompletedEvent): Promise<void> {
    this.logger.log(`Processing deposit completed event for deposit ${event.depositId}`);

    try {
      // Send push notification via NTM
      await this.ntmClient.send({
        template: 'deposit.completed',
        channel: 'push',
        recipient: { userId: event.userId },
        variables: {
          depositId: event.depositId,
          amount: (Number(event.amount) / 100).toFixed(2),
          currency: event.currency,
          provider: event.providerCode,
        },
        priority: 'high',
      }).catch(err => {
        this.logger.warn(`NTM push failed for deposit ${event.depositId}: ${err.message}`);
      });

      this.logger.log(`Successfully processed deposit completed event for ${event.depositId}`);
    } catch (error) {
      this.logger.error(`Failed to process deposit completed event for ${event.depositId}:`, error);
    }
  }

  @OnEvent('deposit.failed')
  async handleDepositFailed(event: DepositFailedEvent): Promise<void> {
    this.logger.log(`Processing deposit failed event for deposit ${event.depositId}`);

    try {
      await this.ntmClient.send({
        template: 'deposit.failed',
        channel: 'push',
        recipient: { userId: event.userId },
        variables: {
          depositId: event.depositId,
          reason: event.reason || 'Unknown error',
          provider: event.providerCode,
        },
        priority: 'normal',
      }).catch(err => {
        this.logger.warn(`NTM push failed for failed deposit ${event.depositId}: ${err.message}`);
      });

      this.logger.log(`Successfully processed deposit failed event for ${event.depositId}`);
    } catch (error) {
      this.logger.error(`Failed to process deposit failed event for ${event.depositId}:`, error);
    }
  }
}
