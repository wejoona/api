import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Repositories } from '@modules/notification/infrastructure/repositories';
import { Queries } from '@modules/notification/application/queries';
import { Mappers } from '@modules/notification/infrastructure/mappers';
import { UseCases } from '@modules/notification/application/domain/usecases';
import { Controllers } from '@modules/notification/application/controllers';
import { CommandHandlers } from '@modules/notification/application/commands';
import { OrmEntities } from '@modules/notification/infrastructure/orm-entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Services } from '@modules/notification/application/domain/services';
import { SharedModule } from '@modules/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([...OrmEntities]),
    CqrsModule,
    SharedModule, // For PUSH_GATEWAY access
  ],
  providers: [
    ...CommandHandlers,
    ...Queries,
    ...Repositories,
    ...Mappers,
    ...UseCases,
    ...Services,
  ],
  controllers: [...Controllers],
  exports: [...Services], // Export NotificationService for use in other modules
})
export class NotificationModule {}
