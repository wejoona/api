import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * Audit Event Listener
 *
 * Catches domain events that previously had no listeners (orphan events).
 * Provides audit logging so nothing is silently dropped.
 * Complex handling will move to NTM (external notification service) later.
 */
@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  // ============================================
  // WALLET EVENTS (audit logging)
  // ============================================

  @OnEvent('wallet.created')
  handleWalletCreated(event: any): void {
    this.logger.log(
      `[AUDIT] wallet.created — userId=${event.userId ?? 'unknown'}, walletId=${event.walletId ?? event.id ?? 'unknown'}`,
    );
  }

  @OnEvent('wallet.deleted')
  handleWalletDeleted(event: any): void {
    this.logger.log(
      `[AUDIT] wallet.deleted — userId=${event.userId ?? 'unknown'}, walletId=${event.walletId ?? event.id ?? 'unknown'}`,
    );
  }

  // ============================================
  // USER EVENTS (audit logging)
  // ============================================

  @OnEvent('user.verified')
  handleUserVerified(event: any): void {
    this.logger.log(
      `[AUDIT] user.verified — userId=${event.userId ?? event.id ?? 'unknown'}`,
    );
  }

  @OnEvent('user.profile.updated')
  handleUserProfileUpdated(event: any): void {
    this.logger.log(
      `[AUDIT] user.profile.updated — userId=${event.userId ?? event.id ?? 'unknown'}`,
    );
  }

  // ============================================
  // BILL PAYMENT EVENTS (notification-worthy)
  // ============================================

  @OnEvent('bill.payment.completed')
  handleBillPaymentCompleted(event: any): void {
    this.logger.log(
      `[AUDIT] bill.payment.completed — userId=${event.userId ?? 'unknown'}, amount=${event.amount ?? 'unknown'}, billerId=${event.billerId ?? 'unknown'}`,
    );
  }

  @OnEvent('bill.payment.failed')
  handleBillPaymentFailed(event: any): void {
    this.logger.warn(
      `[AUDIT] bill.payment.failed — userId=${event.userId ?? 'unknown'}, amount=${event.amount ?? 'unknown'}, reason=${event.reason ?? 'unknown'}`,
    );
  }

  // ============================================
  // MERCHANT EVENTS (notification-worthy)
  // ============================================

  @OnEvent('merchant.payment.completed')
  handleMerchantPaymentCompleted(event: any): void {
    this.logger.log(
      `[AUDIT] merchant.payment.completed — merchantId=${event.merchantId ?? 'unknown'}, amount=${event.amount ?? 'unknown'}`,
    );
  }

  @OnEvent('merchant.payment.requested')
  handleMerchantPaymentRequested(event: any): void {
    this.logger.log(
      `[AUDIT] merchant.payment.requested — merchantId=${event.merchantId ?? 'unknown'}, amount=${event.amount ?? 'unknown'}`,
    );
  }

  @OnEvent('merchant.registered')
  handleMerchantRegistered(event: any): void {
    this.logger.log(
      `[AUDIT] merchant.registered — merchantId=${event.merchantId ?? event.id ?? 'unknown'}`,
    );
  }

  @OnEvent('merchant.verified')
  handleMerchantVerified(event: any): void {
    this.logger.log(
      `[AUDIT] merchant.verified — merchantId=${event.merchantId ?? event.id ?? 'unknown'}`,
    );
  }

  // ============================================
  // COMPLIANCE / SANCTIONS EVENTS
  // ============================================

  @OnEvent('sanctions.entity.flagged')
  handleSanctionsEntityFlagged(event: any): void {
    this.logger.warn(
      `[AUDIT] sanctions.entity.flagged — entityId=${event.entityId ?? 'unknown'}, matchScore=${event.matchScore ?? 'unknown'}`,
    );
  }

  @OnEvent('sanctions.match.confirmed')
  handleSanctionsMatchConfirmed(event: any): void {
    this.logger.warn(
      `[AUDIT] sanctions.match.confirmed — entityId=${event.entityId ?? 'unknown'}`,
    );
  }

  @OnEvent('sanctions.match.dismissed')
  handleSanctionsMatchDismissed(event: any): void {
    this.logger.log(
      `[AUDIT] sanctions.match.dismissed — entityId=${event.entityId ?? 'unknown'}`,
    );
  }

  // ============================================
  // WALLET PIN / MISC EVENTS
  // ============================================

  @OnEvent('wallet.pin.set')
  handleWalletPinSet(event: any): void {
    this.logger.log(
      `[AUDIT] wallet.pin.set — userId=${event.userId ?? 'unknown'}`,
    );
  }

  @OnEvent('schedule.cancelled')
  handleScheduleCancelled(event: any): void {
    this.logger.log(
      `[AUDIT] schedule.cancelled — scheduleId=${event.scheduleId ?? event.id ?? 'unknown'}`,
    );
  }
}
