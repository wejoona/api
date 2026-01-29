import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  SupportTicketRepository,
  FindTicketsOptions,
} from '../../domain/repositories/support-ticket.repository';
import {
  SupportTicket,
  TicketStatus,
} from '../../domain/entities/support-ticket.entity';
import { SupportTicketOrmEntity } from '../orm-entities/support-ticket.orm-entity';
import { SupportTicketMapper } from '../mappers/support-ticket.mapper';

@Injectable()
export class TypeOrmSupportTicketRepository extends SupportTicketRepository {
  constructor(
    @InjectRepository(SupportTicketOrmEntity)
    private readonly repo: Repository<SupportTicketOrmEntity>,
    private readonly mapper: SupportTicketMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<SupportTicket | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<SupportTicket[]> {
    const entities = await this.repo.find({
      where!: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActiveByUserId(userId: string): Promise<SupportTicket[]> {
    const entities = await this.repo.find({
      where!: {
        userId,
        status: Not(In([TicketStatus.RESOLVED, TicketStatus.CLOSED])),
      },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async find(options: FindTicketsOptions): Promise<SupportTicket[]> {
    const queryBuilder = this.repo.createQueryBuilder('ticket');

    if (options.userId) {
      queryBuilder.andWhere('ticket.user_id = :userId', {
        userId!: options.userId,
      });
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        queryBuilder.andWhere('ticket.status IN (:...statuses)', {
          statuses!: options.status,
        });
      } else {
        queryBuilder.andWhere('ticket.status = :status', {
          status!: options.status,
        });
      }
    }

    if (options.priority) {
      queryBuilder.andWhere('ticket.priority = :priority', {
        priority!: options.priority,
      });
    }

    if (options.category) {
      queryBuilder.andWhere('ticket.category = :category', {
        category!: options.category,
      });
    }

    if (options.assignedTo) {
      queryBuilder.andWhere('ticket.assigned_to = :assignedTo', {
        assignedTo!: options.assignedTo,
      });
    }

    queryBuilder.orderBy('ticket.created_at', 'DESC');

    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async count(options: FindTicketsOptions): Promise<number> {
    const queryBuilder = this.repo.createQueryBuilder('ticket');

    if (options.userId) {
      queryBuilder.andWhere('ticket.user_id = :userId', {
        userId!: options.userId,
      });
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        queryBuilder.andWhere('ticket.status IN (:...statuses)', {
          statuses!: options.status,
        });
      } else {
        queryBuilder.andWhere('ticket.status = :status', {
          status!: options.status,
        });
      }
    }

    if (options.priority) {
      queryBuilder.andWhere('ticket.priority = :priority', {
        priority!: options.priority,
      });
    }

    if (options.category) {
      queryBuilder.andWhere('ticket.category = :category', {
        category!: options.category,
      });
    }

    if (options.assignedTo) {
      queryBuilder.andWhere('ticket.assigned_to = :assignedTo', {
        assignedTo!: options.assignedTo,
      });
    }

    return queryBuilder.getCount();
  }

  async save(ticket: SupportTicket): Promise<SupportTicket> {
    const entity = this.mapper.toOrmEntity(ticket);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async findOpenTickets(limit = 50): Promise<SupportTicket[]> {
    const entities = await this.repo.find({
      where!: { status: TicketStatus.OPEN },
      order: { priority: 'DESC', createdAt: 'ASC' },
      take: limit,
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findAssignedTo(agentId: string): Promise<SupportTicket[]> {
    const entities = await this.repo.find({
      where!: {
        assignedTo: agentId,
        status: Not(In([TicketStatus.RESOLVED, TicketStatus.CLOSED])),
      },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async countByStatus(status: TicketStatus): Promise<number> {
    return this.repo.count({ where: { status } });
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.repo.count({
      where!: {
        userId,
        status: Not(In([TicketStatus.RESOLVED, TicketStatus.CLOSED])),
      },
    });
  }
}
