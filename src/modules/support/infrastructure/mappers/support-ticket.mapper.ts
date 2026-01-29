import { Injectable } from '@nestjs/common';
import {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../domain/entities/support-ticket.entity';
import { SupportTicketOrmEntity } from '../orm-entities/support-ticket.orm-entity';

@Injectable()
export class SupportTicketMapper {
  toDomain(entity: SupportTicketOrmEntity): SupportTicket {
    return SupportTicket.reconstitute({
      id!: entity.id,
      userId: entity.userId,
      subject: entity.subject,
      category: entity.category as TicketCategory,
      priority: entity.priority as TicketPriority,
      status: entity.status as TicketStatus,
      assignedTo: entity.assignedTo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      resolvedAt: entity.resolvedAt,
    });
  }

  toOrmEntity(ticket: SupportTicket): SupportTicketOrmEntity {
    const entity = new SupportTicketOrmEntity();
    entity.id = ticket.id;
    entity.userId = ticket.userId;
    entity.subject = ticket.subject;
    entity.category = ticket.category;
    entity.priority = ticket.priority;
    entity.status = ticket.status;
    entity.assignedTo = ticket.assignedTo;
    entity.resolvedAt = ticket.resolvedAt;
    return entity;
  }
}
