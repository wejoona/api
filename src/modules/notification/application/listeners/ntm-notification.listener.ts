import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NtmClientService } from '@modules/shared/infrastructure/services';

/**
 * NTM Notification Listener
 *
 * Routes internal domain events to the external Notification Template Manager (NTM)
 * for actual delivery via push, SMS, and email channels.
 *
 * All calls are fire-and-forget with try/catch to ensure notification failures
 * never crash the main application flow.
 */
@Injectable()
export class NtmNotificationListener {
  private readonly logger = new Logger(NtmNotificationListener.name);

  constructor(private readonly ntmClient: NtmClientService) {}

  // ─── KYC Events ──────────────────────────────────────────────

  @OnEvent('kyc.submitted')
  handleKycSubmitted(payload: any) {
    this.sendSafe({
      template: 'kyc-submitted',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: { kycId: payload.kycId },
    });
  }

  @OnEvent('kyc.approved')
  handleKycApproved(payload: any) {
    this.sendSafe({
      template: 'kyc-approved',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: { firstName: payload.firstName, kycId: payload.kycId },
      priority: 'high',
    });
  }

  @OnEvent('kyc.rejected')
  handleKycRejected(payload: any) {
    this.sendSafe({
      template: 'kyc-rejected',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        reason: payload.rejectionReason || 'Documents unclear or invalid',
        kycId: payload.kycId,
      },
      priority: 'high',
    });
  }

  @OnEvent('kyc.requires_review')
  handleKycRequiresReview(payload: any) {
    this.sendSafe({
      template: 'kyc-requires-review',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: { kycId: payload.kycId },
    });
  }

  // ─── Transaction Events ──────────────────────────────────────

  @OnEvent('transaction.deposit.completed')
  handleDepositCompleted(payload: any) {
    this.sendSafe({
      template: 'deposit-completed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        transactionId: payload.transactionId,
      },
      priority: 'high',
    });
  }

  @OnEvent('transaction.deposit.failed')
  handleDepositFailed(payload: any) {
    this.sendSafe({
      template: 'deposit-failed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        reason: payload.reason || 'Unknown error',
      },
      priority: 'high',
    });
  }

  @OnEvent('transaction.transfer.sent')
  handleTransferCompleted(payload: any) {
    this.sendSafe({
      template: 'transfer-sent',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        recipientName: payload.recipientName || 'recipient',
        transactionId: payload.transactionId,
      },
    });
  }

  @OnEvent('transaction.transfer.received')
  handleTransferReceived(payload: any) {
    this.sendSafe({
      template: 'transfer-received',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        senderName: payload.senderName || 'Someone',
        transactionId: payload.transactionId,
      },
      priority: 'high',
    });
  }

  @OnEvent('transaction.transfer.failed')
  handleTransferFailed(payload: any) {
    this.sendSafe({
      template: 'transfer-failed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        reason: payload.reason || 'Unknown error',
      },
      priority: 'high',
    });
  }

  @OnEvent('transaction.withdrawal.completed')
  handleWithdrawalCompleted(payload: any) {
    this.sendSafe({
      template: 'withdrawal-completed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        transactionId: payload.transactionId,
      },
      priority: 'high',
    });
  }

  @OnEvent('transaction.withdrawal.failed')
  handleWithdrawalFailed(payload: any) {
    this.sendSafe({
      template: 'withdrawal-failed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        reason: payload.reason || 'Unknown error',
      },
      priority: 'high',
    });
  }

  // ─── Scheduled Payment Events ────────────────────────────────

  @OnEvent('schedule.created')
  handleScheduleCreated(payload: any) {
    this.sendSafe({
      template: 'schedule-created',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        recipientName: payload.recipientName,
        frequency: payload.frequency,
      },
    });
  }

  @OnEvent('scheduled.payment.executed')
  handleScheduledPaymentExecuted(payload: any) {
    this.sendSafe({
      template:
        payload.status === 'completed'
          ? 'scheduled-payment-sent'
          : 'scheduled-payment-failed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        recipientName: payload.recipientName,
        reason: payload.failureReason,
      },
      priority: payload.status === 'failed' ? 'high' : 'normal',
    });
  }

  @OnEvent('scheduled.payment.upcoming')
  handleScheduledPaymentUpcoming(payload: any) {
    this.sendSafe({
      template: 'scheduled-payment-upcoming',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        recipientName: payload.recipientName,
        scheduledAt: payload.scheduledAt,
      },
    });
  }

  @OnEvent('scheduled.payment.low_balance')
  handleLowBalance(payload: any) {
    this.sendSafe({
      template: 'scheduled-payment-low-balance',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        currentBalance: payload.currentBalance,
      },
      priority: 'high',
    });
  }

  // ─── Security Events ─────────────────────────────────────────

  @OnEvent('security.login.success')
  handleNewDeviceLogin(payload: any) {
    if (payload.type !== 'new_device') return;
    this.sendSafe({
      template: 'security-new-device-login',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        location: payload.location || 'unknown location',
        deviceInfo: payload.deviceInfo || 'Unknown device',
      },
      priority: 'critical',
    });
  }

  @OnEvent('security.password.changed')
  handlePasswordChanged(payload: any) {
    this.sendSafe({
      template: 'security-password-changed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {},
      priority: 'high',
    });
  }

  @OnEvent('security.suspicious_activity')
  handleSuspiciousActivity(payload: any) {
    this.sendSafe({
      template: 'security-suspicious-activity',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: { ipAddress: payload.ipAddress },
      priority: 'critical',
    });
  }

  @OnEvent('security.pin.changed')
  handlePinChanged(payload: any) {
    this.sendSafe({
      template: 'security-pin-changed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {},
    });
  }

  // ─── Referral Events ─────────────────────────────────────────

  @OnEvent('referral.signed_up')
  handleReferralSignedUp(payload: any) {
    this.sendSafe({
      template: 'referral-signed-up',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {},
    });
  }

  @OnEvent('referral.reward.earned')
  handleRewardEarned(payload: any) {
    this.sendSafe({
      template: 'referral-reward-earned',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.rewardAmount,
        currency: payload.rewardCurrency || 'USDC',
      },
      priority: 'high',
    });
  }

  @OnEvent('referral.reward.credited')
  handleRewardCredited(payload: any) {
    this.sendSafe({
      template: 'referral-reward-credited',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.rewardAmount,
        currency: payload.rewardCurrency || 'USDC',
      },
    });
  }

  // ─── Bill Payment Events ─────────────────────────────────────

  @OnEvent('bill.payment.completed')
  handleBillPaymentCompleted(payload: any) {
    this.sendSafe({
      template: 'bill-payment-completed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        billerName: payload.billerName,
      },
    });
  }

  @OnEvent('bill.payment.failed')
  handleBillPaymentFailed(payload: any) {
    this.sendSafe({
      template: 'bill-payment-failed',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: {
        amount: payload.amount,
        currency: payload.currency,
        billerName: payload.billerName,
        reason: payload.reason || 'Unknown error',
      },
      priority: 'high',
    });
  }

  // ─── User Events ─────────────────────────────────────────────

  @OnEvent('user.verified')
  handleUserVerified(payload: any) {
    this.sendSafe({
      template: 'user-verified',
      channel: 'push',
      recipient: { userId: payload.userId },
      variables: { firstName: payload.firstName },
    });
  }

  // ─── Helper ───────────────────────────────────────────────────

  /**
   * Fire-and-forget send with error swallowing.
   * Notification failures must never crash the main flow.
   */
  private sendSafe(notification: Parameters<NtmClientService['send']>[0]) {
    this.ntmClient.send(notification).catch((error) => {
      this.logger.error(
        `[NTM] Unhandled error sending ${notification.template}: ${error.message}`,
        error.stack,
      );
    });
  }
}
