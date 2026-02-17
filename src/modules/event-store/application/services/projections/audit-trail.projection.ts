import { Injectable } from '@nestjs/common';
import { IProjectionHandler } from '../projection-builder.service';
import { Event } from '../../../domain/entities/event.entity';

/**
 * Audit Trail Projection
 * Builds comprehensive audit trail for compliance
 */
@Injectable()
export class AuditTrailProjection implements IProjectionHandler {
  readonly projectionName = 'audit_trail';
  readonly eventTypes = [
    'transaction.created',
    'transaction.completed',
    'transaction.failed',
    'wallet.created',
    'wallet.credited',
    'wallet.debited',
    'user.verified',
    'user.registered',
    'kyc.submitted',
    'kyc.approved',
    'kyc.rejected',
    'consent.granted',
    'consent.revoked',
    'security.login.success',
    'security.pin.changed',
  ];

  buildInitial(event: Event): Record<string, any> {
    return {
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      events: [this.formatAuditEntry(event)],
      startDate: event.timestamp,
      endDate: event.timestamp,
      eventCount: 1,
      userActions: event.userId ? [event.userId] : [],
      criticalEvents: this.isCriticalEvent(event) ? 1 : 0,
    };
  }

  apply(currentData: Record<string, any>, event: Event): Record<string, any> {
    const userActions = new Set([...currentData.userActions]);
    if (event.userId) {
      userActions.add(event.userId);
    }

    return {
      ...currentData,
      events: [...currentData.events, this.formatAuditEntry(event)],
      endDate: event.timestamp,
      eventCount: currentData.eventCount + 1,
      userActions: Array.from(userActions),
      criticalEvents:
        currentData.criticalEvents + (this.isCriticalEvent(event) ? 1 : 0),
    };
  }

  private formatAuditEntry(event: Event): any {
    return {
      eventId: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp,
      version: event.version,
      userId: event.userId,
      correlationId: event.correlationId,
      data: event.eventData,
      metadata: {
        ipAddress: event.metadata.ipAddress,
        userAgent: event.metadata.userAgent,
        deviceId: event.metadata.deviceId,
        source: event.metadata.source,
      },
      critical: this.isCriticalEvent(event),
    };
  }

  private isCriticalEvent(event: Event): boolean {
    const criticalEvents = [
      'transaction.completed',
      'wallet.created',
      'user.verified',
      'user.registered',
      'kyc.approved',
      'kyc.rejected',
      'consent.granted',
      'consent.revoked',
    ];
    return criticalEvents.includes(event.eventType);
  }
}
