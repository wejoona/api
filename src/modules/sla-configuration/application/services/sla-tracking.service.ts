import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SlaConfigurationService } from './sla-configuration.service';
import { SlaCategory, SlaPriority } from '../../domain/entities/sla-configuration.entity';

export interface SlaBreachEvent {
  entityId: string;
  entityType: 'support_ticket' | 'kyc_submission' | 'complaint' | 'case';
  category: SlaCategory;
  priority: SlaPriority;
  breachType: 'response' | 'resolution' | 'escalation';
  createdAt: Date;
  breachedAt: Date;
  timeElapsedMs: number;
  slaTimeMs: number;
}

@Injectable()
export class SlaTrackingService {
  private readonly logger = new Logger(SlaTrackingService.name);

  constructor(
    private readonly slaConfigService: SlaConfigurationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check SLA status for a support ticket
   */
  async checkTicketSla(
    ticketId: string,
    category: SlaCategory,
    priority: SlaPriority,
    createdAt: Date,
    respondedAt: Date | null,
    resolvedAt: Date | null,
    escalatedAt: Date | null,
  ): Promise<void> {
    try {
      const result = await this.slaConfigService.checkSlaBreached(
        category,
        priority,
        createdAt,
        respondedAt,
        resolvedAt,
        escalatedAt,
      );

      if (result.isResponseBreached && !respondedAt) {
        this.logger.warn(
          `Response SLA breached for ticket ${ticketId} - ${category}/${priority}`,
        );
        this.emitSlaBreachEvent({
          entityId: ticketId,
          entityType: 'support_ticket',
          category,
          priority,
          breachType: 'response',
          createdAt,
          breachedAt: new Date(),
          timeElapsedMs: result.responseTimeElapsedMs,
          slaTimeMs: result.slaConfig.responseTimeMs,
        });
      }

      if (result.isResolutionBreached && !resolvedAt) {
        this.logger.warn(
          `Resolution SLA breached for ticket ${ticketId} - ${category}/${priority}`,
        );
        this.emitSlaBreachEvent({
          entityId: ticketId,
          entityType: 'support_ticket',
          category,
          priority,
          breachType: 'resolution',
          createdAt,
          breachedAt: new Date(),
          timeElapsedMs: result.resolutionTimeElapsedMs,
          slaTimeMs: result.slaConfig.resolutionTimeMs,
        });
      }

      if (result.shouldEscalate) {
        this.logger.warn(
          `Escalation needed for ticket ${ticketId} - ${category}/${priority}`,
        );
        this.emitSlaBreachEvent({
          entityId: ticketId,
          entityType: 'support_ticket',
          category,
          priority,
          breachType: 'escalation',
          createdAt,
          breachedAt: new Date(),
          timeElapsedMs: result.resolutionTimeElapsedMs,
          slaTimeMs: result.slaConfig.escalationAfterMs!,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error checking SLA for ticket ${ticketId}: ${error.message}`,
      );
    }
  }

  /**
   * Check SLA status for a KYC submission
   */
  async checkKycSla(
    kycId: string,
    priority: SlaPriority,
    submittedAt: Date,
    reviewedAt: Date | null,
    completedAt: Date | null,
  ): Promise<void> {
    try {
      const result = await this.slaConfigService.checkSlaBreached(
        SlaCategory.KYC,
        priority,
        submittedAt,
        reviewedAt,
        completedAt,
        null,
      );

      if (result.isResponseBreached && !reviewedAt) {
        this.logger.warn(`KYC review SLA breached for submission ${kycId}`);
        this.emitSlaBreachEvent({
          entityId: kycId,
          entityType: 'kyc_submission',
          category: SlaCategory.KYC,
          priority,
          breachType: 'response',
          createdAt: submittedAt,
          breachedAt: new Date(),
          timeElapsedMs: result.responseTimeElapsedMs,
          slaTimeMs: result.slaConfig.responseTimeMs,
        });
      }

      if (result.isResolutionBreached && !completedAt) {
        this.logger.warn(`KYC completion SLA breached for submission ${kycId}`);
        this.emitSlaBreachEvent({
          entityId: kycId,
          entityType: 'kyc_submission',
          category: SlaCategory.KYC,
          priority,
          breachType: 'resolution',
          createdAt: submittedAt,
          breachedAt: new Date(),
          timeElapsedMs: result.resolutionTimeElapsedMs,
          slaTimeMs: result.slaConfig.resolutionTimeMs,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error checking KYC SLA for ${kycId}: ${error.message}`,
      );
    }
  }

  /**
   * Cron job to check for SLA breaches every 15 minutes
   * This would be integrated with the actual ticket/KYC repositories
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkAllSlas(): Promise<void> {
    this.logger.debug('Running SLA breach check cron job');
    // This would query open tickets and pending KYC submissions
    // and check their SLAs
    // Implementation would depend on integration with Support and KYC modules
  }

  /**
   * Emit SLA breach event for notification/alerting systems
   */
  private emitSlaBreachEvent(event: SlaBreachEvent): void {
    this.eventEmitter.emit('sla.breached', event);
  }

  /**
   * Calculate SLA metrics for reporting
   */
  async calculateSlaMetrics(
    category: SlaCategory,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCount: number;
    withinSla: number;
    breachedSla: number;
    averageResponseTimeMs: number;
    averageResolutionTimeMs: number;
    slaComplianceRate: number;
  }> {
    // This would query resolved tickets/cases within the date range
    // and calculate SLA metrics
    // Implementation depends on integration with ticket/case repositories
    return {
      totalCount: 0,
      withinSla: 0,
      breachedSla: 0,
      averageResponseTimeMs: 0,
      averageResolutionTimeMs: 0,
      slaComplianceRate: 0,
    };
  }
}
