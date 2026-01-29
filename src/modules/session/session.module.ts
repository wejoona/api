import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionOrmEntity } from './infrastructure/orm-entities/session.orm-entity';
import { SessionRepository } from './domain/repositories/session.repository';
import { TypeOrmSessionRepository } from './infrastructure/repositories/session.repository';
import { SessionMapper } from './infrastructure/mappers/session.mapper';
import { SessionService } from './application/services/session.service';
import { SessionController } from './application/controllers/session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SessionOrmEntity])],
  controllers: [SessionController],
  providers: [
    SessionMapper,
    SessionService,
    {
      provide: SessionRepository,
      useClass: TypeOrmSessionRepository,
    },
  ],
  exports: [SessionService, SessionRepository],
})
export class SessionModule {}
