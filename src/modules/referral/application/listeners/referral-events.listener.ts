/**
 * Referral Events Listener
 * Listens for KYC and transaction events to process referrals
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReferralService } from '../domain/services/referral.service';

interface KycApprovedEvent {
  userId: string;
  kycId: string;
}

interface TransactionCompletedEvent {
  userId: string;
  transactionId: string;
  type: string;
  amount: number;
  currency: string;
}

interface ReferralAppliedEvent {
  referralId: string;
  referrerId: string;
  referredId: string;
  code: string;
}

interface ReferralCompletedEvent {
  referralId: string;
  referrerId: string;
  referredId: string;
}

@Injectable()
export class ReferralEventsListener {
  private readonly logger = new Logger(ReferralEventsListener.name);
  private readonly firstTransactionTracking = new Map<string, boolean>();

  constructor(private readonly referralService: ReferralService) {}

  /**
   * When KYC is approved, check if user was referred and mark as completed
   */
  @OnEvent('kyc.approved')
  async handleKycApproved(event: KycApprovedEvent) {
    this.logger.log(`Processing KYC approved event for user ${event.userId}`);

    try {
      // Complete the referral if user was referred
      await this.referralService.completeReferral(event.userId);

      // Update tier for referring user
      const stats = await this.referralService.getUserStats(event.userId);
      if (stats) {
        await this.referralService.updateUserTier(stats.userId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process KYC approved for referral: ${error}`,
      );
    }
  }

  /**
   * When a transaction completes, check if it's first transaction for referral
   */
  @OnEvent('transaction.completed')
  async handleTransactionCompleted(event: TransactionCompletedEvent) {
    // Only process for transfers/payments, not deposits
    if (event.type === 'deposit') return;

    // Check if we've already tracked first transaction for this user
    if (this.firstTransactionTracking.has(event.userId)) return;

    this.logger.log(`Processing first transaction for user ${event.userId}`);

    try {
      // Mark as tracked
      this.firstTransactionTracking.set(event.userId, true);

      // Complete the referral
      await this.referralService.completeReferral(event.userId);
    } catch (error) {
      this.logger.error(`Failed to process transaction for referral: ${error}`);
    }
  }

  /**
   * When referral is applied, emit notification to referrer
   */
  @OnEvent('referral.applied')
  async handleReferralApplied(event: ReferralAppliedEvent) {
    this.logger.log(
      `Referral applied: ${event.referrerId} referred ${event.referredId}`,
    );

    // This event is already emitted from ReferralService
    // The notification listener will pick it up
  }

  /**
   * When referral is completed, process rewards
   */
  @OnEvent('referral.completed')
  async handleReferralCompleted(event: ReferralCompletedEvent) {
    this.logger.log(`Processing rewards for referral ${event.referralId}`);

    try {
      // Process rewards (credit to wallets)
      await this.referralService.processRewards(event.referralId);

      // Update referrer's tier
      await this.referralService.updateUserTier(event.referrerId);
    } catch (error) {
      this.logger.error(`Failed to process referral rewards: ${error}`);
    }
  }

  /**
   * When referral is rewarded, notify both parties
   */
  @OnEvent('referral.rewarded')
  async handleReferralRewarded(event: {
    referralId: string;
    referrerId: string;
    referredId: string;
    referrerReward: string;
    referredReward: string;
  }) {
    this.logger.log(`Referral ${event.referralId} rewarded`);

    // The notification service will handle sending notifications
    // via the referral.reward.earned and referral.reward.credited events
  }
}
