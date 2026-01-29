/**
 * Referral Notification Listener
 * Listens for referral events and sends notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { ReferralNotificationEvent } from '../../domain/interfaces/notification.types';

@Injectable()
export class ReferralNotificationListener {
  private readonly logger = new Logger(ReferralNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('referral.signed_up')
  async handleReferralSignedUp(
    event: ReferralNotificationEvent & { refereeId?: string },
  ) {
    this.logger.log(
      `Sending referral signed up notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'referral',
      title: 'New Referral!',
      body: "Someone signed up using your referral code! You'll earn rewards once they complete verification.",
      templateId: 'referral.signed_up',
      templateData: {
        refereeName: 'A new user', // Privacy: don't reveal name
      },
      data: {
        type: 'referral_signed_up',
        refereeId: event.refereeId,
      },
      deepLink: '/referrals',
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('referral.reward.earned')
  async handleRewardEarned(event: ReferralNotificationEvent) {
    this.logger.log(
      `Sending reward earned notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'referral',
      title: 'Reward Earned!',
      body: `You've earned ${event.rewardAmount} ${event.rewardCurrency} from your referral.`,
      templateId: 'referral.reward.earned',
      templateData: {
        amount: event.rewardAmount,
        currency: event.rewardCurrency || 'USDC',
      },
      data: {
        type: 'reward_earned',
        amount: event.rewardAmount,
        currency: event.rewardCurrency,
      },
      deepLink: '/referrals',
      channels: ['push', 'email', 'in_app'],
      priority: 'high',
    });
  }

  @OnEvent('referral.reward.credited')
  async handleRewardCredited(event: ReferralNotificationEvent) {
    this.logger.log(
      `Sending reward credited notification for user ${event.userId}`,
    );

    await this.notificationService.send({
      userId: event.userId,
      category: 'referral',
      title: 'Reward Added to Wallet',
      body: `${event.rewardAmount} ${event.rewardCurrency} has been added to your wallet.`,
      templateId: 'referral.reward.credited',
      templateData: {
        amount: event.rewardAmount,
        currency: event.rewardCurrency || 'USDC',
      },
      data: {
        type: 'reward_credited',
        amount: event.rewardAmount,
        currency: event.rewardCurrency,
      },
      deepLink: '/wallet',
      channels: ['push', 'in_app'],
      priority: 'normal',
    });
  }

  @OnEvent('referral.tier.upgraded')
  async handleTierUpgraded(event: {
    userId: string;
    oldTier: string;
    newTier: string;
  }) {
    this.logger.log(
      `Sending tier upgrade notification for user ${event.userId}`,
    );

    const tierBenefits: Record<string, string> = {
      silver: '25% bonus on referral rewards',
      gold: '50% bonus on referral rewards + priority support',
      platinum: '75% bonus on referral rewards + VIP benefits',
      diamond: 'Double rewards + exclusive campaigns',
    };

    await this.notificationService.send({
      userId: event.userId,
      category: 'referral',
      title: `You're Now ${event.newTier.charAt(0).toUpperCase() + event.newTier.slice(1)}!`,
      body: `Congratulations! You've reached ${event.newTier} tier. ${tierBenefits[event.newTier] || 'Enjoy your new benefits!'}`,
      data: {
        type: 'tier_upgraded',
        oldTier: event.oldTier,
        newTier: event.newTier,
      },
      deepLink: '/referrals',
      channels: ['push', 'email', 'in_app'],
      priority: 'high',
    });
  }
}
