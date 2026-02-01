import { Injectable } from '@nestjs/common';
import {
  TicketMessage,
  MessageSenderType,
  Attachment,
} from '../../domain/entities/ticket-message.entity';
import { TicketMessageOrmEntity } from '../orm-entities/ticket-message.orm-entity';

@Injectable()
export class TicketMessageMapper {
  toDomain(entity: TicketMessageOrmEntity): TicketMessage {
    return TicketMessage.reconstitute({
      id: entity.id,
      ticketId: entity.ticketId,
      senderType: entity.senderType as MessageSenderType,
      senderId: entity.senderId,
      message: entity.message,
      attachments: entity.attachments as Attachment[],
      createdAt: entity.createdAt,
    });
  }

  toOrmEntity(message: TicketMessage): TicketMessageOrmEntity {
    const entity = new TicketMessageOrmEntity();
    entity.id = message.id;
    entity.ticketId = message.ticketId;
    entity.senderType = message.senderType;
    entity.senderId = message.senderId;
    entity.message = message.message;
    entity.attachments = message.attachments;
    return entity;
  }
}
