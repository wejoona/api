import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DepositCompletedEvent, DepositFailedEvent } from '../../domain/events/deposit.events';

@Injectable()
export class DepositCompletedListener {
  private readonly logger = new Logger(DepositCompletedListener.name);

  @OnEvent('deposit.completed')
  async handleDepositCompleted(event: DepositCompletedEvent): Promise<void> {
    this.logger.log(`Processing deposit completed event for deposit ${event.depositId}`);

    try {
      // TODO: Send push notification to user
      // await this.notificationService.sendPushNotification(event.userId, {
      //   title: 'Deposit Successful',
      //   body: `Your deposit of ${event.amount / 100n} ${event.currency} has been completed`,
      //   type: 'deposit_completed',
      //   metadata: {
      //     depositId: event.depositId,
      //     amount: event.amount.toString(),
      //     currency: event.currency,
      //   },
      // });

      // TODO: Update user analytics/metrics
      // await this.analyticsService.trackEvent('deposit_completed', {
      //   userId: event.userId,
      //   depositId: event.depositId,
      //   amount: event.amount.toString(),
      //   currency: event.currency,
      //   provider: event.providerCode,
      // });

      this.logger.log(`Successfully processed deposit completed event for ${event.depositId}`);
    } catch (error) {
      this.logger.error(`Failed to process deposit completed event for ${event.depositId}:`, error);
      // Don't throw - event processing should not fail the main flow
    }
  }

  @OnEvent('deposit.failed')
  async handleDepositFailed(event: DepositFailedEvent): Promise<void> {
    this.logger.log(`Processing deposit failed event for deposit ${event.depositId}`);

    try {
      // TODO: Send notification about failed deposit
      // await this.notificationService.sendPushNotification(event.userId, {
      //   title: 'Deposit Failed',
      //   body: `Your deposit failed: ${event.reason}`,
      //   type: 'deposit_failed',
      //   metadata: {
      //     depositId: event.depositId,
      //     reason: event.reason,
      //   },
      // });

      // TODO: Track failed deposit for analytics
      // await this.analyticsService.trackEvent('deposit_failed', {
      //   userId: event.userId,
      //   depositId: event.depositId,
      //   reason: event.reason,
      //   provider: event.providerCode,
      // });

      this.logger.log(`Successfully processed deposit failed event for ${event.depositId}`);
    } catch (error) {
      this.logger.error(`Failed to process deposit failed event for ${event.depositId}:`, error);
      // Don't throw - event processing should not fail the main flow
    }
  }
}