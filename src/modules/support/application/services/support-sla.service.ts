import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { TicketMessageRepository } from '../../domain/repositories/ticket-message.repository';
import {
  SupportTicket,
  TicketCategory,
  TicketPriority,
} from '../../domain/entities/support-ticket.entity';
import { MessageSenderType } from '../../domain/entities/ticket-message.entity';
import {
  SlaConfigurationService,
  SlaCheckResult,
} from '../../../sla-configuration/application/services/sla-configuration.service';
import { SlaTrackingService } from '../../../sla-configuration/application/services/sla-tracking.service';
import { SlaCategory, SlaPriority } from '../../../sla-configuration';

/**
 * Service to handle SLA integration for support tickets
 */
@Injectable()
export class SupportSlaService {
  private readonly logger = new Logger(SupportSlaService.name);

  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly messageRepository: TicketMessageRepository,
    private readonly slaConfigService: SlaConfigurationService,
    private readonly slaTrackingService: SlaTrackingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Assign SLA to a newly created ticket
   */
  async assignSlaToNewTicket(ticket: SupportTicket): Promise<void> {
    try {
      const slaCategory = this.mapTicketCategoryToSlaCategory(ticket.category);
      const slaPriority = this.mapTicketPriorityToSlaPriority(ticket.priority);

      const slaConfig = await this.slaConfigService.getSlaForTicket(
        slaCategory,
        slaPriority,
      );

      if (slaConfig) {
        this.logger.log(
          `Assigned SLA config "${slaConfig.name}" to ticket ${ticket.id}`,
        );

        // Emit event for monitoring
        this.eventEmitter.emit('ticket.sla.assigned', {
          ticketId: ticket.id,
          slaConfigId: slaConfig.id,
          responseTimeMinutes: slaConfig.responseTimeMinutes,
          resolutionTimeMinutes: slaConfig.resolutionTimeMinutes,
        });
      } else {
        this.logger.warn(
          `No SLA configuration found for ticket ${ticket.id} - ${slaCategory}/${slaPriority}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error assigning SLA to ticket ${ticket.id}: ${error.message}`,
      );
    }
  }

  /**
   * Check SLA status for a ticket
   */
  async checkTicketSla(ticketId: string): Promise<SlaCheckResult | null> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      return null;
    }

    const slaCategory = this.mapTicketCategoryToSlaCategory(ticket.category);
    const slaPriority = this.mapTicketPriorityToSlaPriority(ticket.priority);

    // Get first agent response time
    const firstAgentMessage =
      await this.messageRepository.findFirstBySenderType(
        ticketId,
        MessageSenderType.AGENT,
      );
    const respondedAt = firstAgentMessage?.createdAt ?? null;

    // Track SLA breach
    await this.slaTrackingService.checkTicketSla(
      ticketId,
      slaCategory,
      slaPriority,
      ticket.createdAt,
      respondedAt,
      ticket.resolvedAt,
      null, // escalatedAt - to be implemented
    );

    // Get detailed SLA check
    try {
      const result = await this.slaConfigService.checkSlaBreached(
        slaCategory,
        slaPriority,
        ticket.createdAt,
        respondedAt,
        ticket.resolvedAt,
        null,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error checking SLA for ticket ${ticketId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Handle SLA breach events
   */
  @OnEvent('sla.breached')
  async handleSlaBreached(event: any): Promise<void> {
    if (event.entityType === 'support_ticket') {
      this.logger.warn(
        `SLA ${event.breachType} breached for ticket ${event.entityId}`,
      );

      // Emit notification event
      this.eventEmitter.emit('notification.send', {
        type: 'sla_breach',
        category: 'support',
        severity: 'high',
        data: {
          ticketId: event.entityId,
          breachType: event.breachType,
          category: event.category,
          priority: event.priority,
        },
      });

      // Could also update ticket priority or auto-escalate
      if (event.breachType === 'escalation') {
        await this.escalateTicket(event.entityId);
      }
    }
  }

  /**
   * Auto-escalate a ticket when SLA escalation time is reached
   */
  private async escalateTicket(ticketId: string): Promise<void> {
    try {
      const ticket = await this.ticketRepository.findById(ticketId);
      if (!ticket) {
        return;
      }

      // Upgrade priority if not already at highest
      if (ticket.priority !== TicketPriority.URGENT) {
        const newPriority =
          ticket.priority === TicketPriority.HIGH
            ? TicketPriority.URGENT
            : ticket.priority === TicketPriority.MEDIUM
              ? TicketPriority.HIGH
              : TicketPriority.MEDIUM;

        ticket.updatePriority(newPriority);
        await this.ticketRepository.save(ticket);

        this.logger.log(
          `Auto-escalated ticket ${ticketId} from ${ticket.priority} to ${newPriority}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error auto-escalating ticket ${ticketId}: ${error.message}`,
      );
    }
  }

  /**
   * Get SLA metrics for a ticket
   */
  async getTicketSlaMetrics(ticketId: string): Promise<{
    responseTimeMs: number | null;
    resolutionTimeMs: number | null;
    slaResponseTimeMet: boolean | null;
    slaResolutionTimeMet: boolean | null;
    slaConfig: any | null;
  }> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      return {
        responseTimeMs: null,
        resolutionTimeMs: null,
        slaResponseTimeMet: null,
        slaResolutionTimeMet: null,
        slaConfig: null,
      };
    }

    const slaCategory = this.mapTicketCategoryToSlaCategory(ticket.category);
    const slaPriority = this.mapTicketPriorityToSlaPriority(ticket.priority);

    const slaConfig = await this.slaConfigService.getSlaForTicket(
      slaCategory,
      slaPriority,
    );

    const firstAgentMessage =
      await this.messageRepository.findFirstBySenderType(
        ticketId,
        MessageSenderType.AGENT,
      );
    const respondedAt = firstAgentMessage?.createdAt ?? null;

    const responseTimeMs = respondedAt
      ? respondedAt.getTime() - ticket.createdAt.getTime()
      : null;

    const resolutionTimeMs = ticket.resolvedAt
      ? ticket.resolvedAt.getTime() - ticket.createdAt.getTime()
      : null;

    const slaResponseTimeMet =
      slaConfig && responseTimeMs !== null
        ? responseTimeMs <= slaConfig.responseTimeMs
        : null;

    const slaResolutionTimeMet =
      slaConfig && resolutionTimeMs !== null
        ? resolutionTimeMs <= slaConfig.resolutionTimeMs
        : null;

    return {
      responseTimeMs,
      resolutionTimeMs,
      slaResponseTimeMet,
      slaResolutionTimeMet,
      slaConfig: slaConfig
        ? {
            name: slaConfig.name,
            responseTimeMinutes: slaConfig.responseTimeMinutes,
            resolutionTimeMinutes: slaConfig.resolutionTimeMinutes,
          }
        : null,
    };
  }

  /**
   * Map ticket category to SLA category
   */
  private mapTicketCategoryToSlaCategory(
    category: TicketCategory,
  ): SlaCategory {
    const mapping: Record<TicketCategory, SlaCategory> = {
      [TicketCategory.ACCOUNT]: SlaCategory.ACCOUNT,
      [TicketCategory.TRANSACTION]: SlaCategory.TRANSACTION,
      [TicketCategory.DEPOSIT]: SlaCategory.DEPOSIT,
      [TicketCategory.WITHDRAWAL]: SlaCategory.WITHDRAWAL,
      [TicketCategory.KYC]: SlaCategory.KYC,
      [TicketCategory.SECURITY]: SlaCategory.SECURITY,
      [TicketCategory.TECHNICAL]: SlaCategory.TECHNICAL,
      [TicketCategory.BILLING]: SlaCategory.BILLING,
      [TicketCategory.OTHER]: SlaCategory.OTHER,
    };

    return mapping[category] || SlaCategory.SUPPORT;
  }

  /**
   * Map ticket priority to SLA priority
   */
  private mapTicketPriorityToSlaPriority(
    priority: TicketPriority,
  ): SlaPriority {
    const mapping: Record<TicketPriority, SlaPriority> = {
      [TicketPriority.LOW]: SlaPriority.LOW,
      [TicketPriority.MEDIUM]: SlaPriority.MEDIUM,
      [TicketPriority.HIGH]: SlaPriority.HIGH,
      [TicketPriority.URGENT]: SlaPriority.URGENT,
    };

    return mapping[priority] || SlaPriority.MEDIUM;
  }
}
