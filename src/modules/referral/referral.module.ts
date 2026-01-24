import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OrmEntities } from './infrastructure/orm-entities';
import { Repositories } from './infrastructure/repositories';
import { Mappers } from './infrastructure/mappers';
import { Services } from './application/domain/services';
import { UseCases } from './application/domain/usecases';
import { Controllers } from './application/controllers';
import { CommandHandlers } from './application/commands';
import { Queries } from './application/queries';

@Module({
  imports: [TypeOrmModule.forFeature([...OrmEntities]), CqrsModule],
  providers: [
    ...Repositories,
    ...Mappers,
    ...Services,
    ...UseCases,
    ...CommandHandlers,
    ...Queries,
  ],
  controllers: [...Controllers],
  exports: [...Services],
})
export class ReferralModule {}
