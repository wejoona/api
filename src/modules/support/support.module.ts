import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicketOrmEntity } from './infrastructure/orm-entities/support-ticket.orm-entity';
import { TicketMessageOrmEntity } from './infrastructure/orm-entities/ticket-message.orm-entity';
import { SupportTicketRepository } from './domain/repositories/support-ticket.repository';
import { TicketMessageRepository } from './domain/repositories/ticket-message.repository';
import { TypeOrmSupportTicketRepository } from './infrastructure/repositories/support-ticket.repository';
import { TypeOrmTicketMessageRepository } from './infrastructure/repositories/ticket-message.repository';
import { SupportTicketMapper } from './infrastructure/mappers/support-ticket.mapper';
import { TicketMessageMapper } from './infrastructure/mappers/ticket-message.mapper';
import { SupportService } from './application/services/support.service';
import { SupportSlaService } from './application/services/support-sla.service';
import { SupportController } from './application/controllers/support.controller';
import { SlaConfigurationModule } from '../sla-configuration';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicketOrmEntity, TicketMessageOrmEntity]),
    SlaConfigurationModule,
  ],
  controllers: [SupportController],
  providers: [
    SupportTicketMapper,
    TicketMessageMapper,
    SupportService,
    SupportSlaService,
    {
      provide: SupportTicketRepository,
      useClass: TypeOrmSupportTicketRepository,
    },
    {
      provide: TicketMessageRepository,
      useClass: TypeOrmTicketMessageRepository,
    },
  ],
  exports: [
    SupportService,
    SupportSlaService,
    SupportTicketRepository,
    TicketMessageRepository,
  ],
})
export class SupportModule {}
