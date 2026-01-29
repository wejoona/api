import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessageRepository } from '../../domain/repositories/ticket-message.repository';
import { TicketMessage, MessageSenderType } from '../../domain/entities/ticket-message.entity';
import { TicketMessageOrmEntity } from '../orm-entities/ticket-message.orm-entity';
import { TicketMessageMapper } from '../mappers/ticket-message.mapper';

@Injectable()
export class TypeOrmTicketMessageRepository extends TicketMessageRepository {
  constructor(
    @InjectRepository(TicketMessageOrmEntity)
    private readonly repo: Repository<TicketMessageOrmEntity>,
    private readonly mapper: TicketMessageMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<TicketMessage | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByTicketId(ticketId: string): Promise<TicketMessage[]> {
    const entities = await this.repo.find({
      where!: { ticketId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByTicketIdPaginated(
    ticketId: string,
    limit: number,
    offset: number,
  ): Promise<TicketMessage[]> {
    const entities = await this.repo.find({
      where!: { ticketId },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(message: TicketMessage): Promise<TicketMessage> {
    const entity = this.mapper.toOrmEntity(message);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async countByTicketId(ticketId: string): Promise<number> {
    return this.repo.count({ where: { ticketId } });
  }

  async getLatestByTicketId(ticketId: string): Promise<TicketMessage | null> {
    const entity = await this.repo.findOne({
      where!: { ticketId },
      order: { createdAt: 'DESC' },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findFirstBySenderType(
    ticketId: string,
    senderType: MessageSenderType,
  ): Promise<TicketMessage | null> {
    const entity = await this.repo.findOne({
      where: { ticketId, senderType },
      order: { createdAt: 'ASC' },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }
}
