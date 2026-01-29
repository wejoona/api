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
import { UserPreferencesModule } from '@modules/user-preferences/user-preferences.module';

// FCM Token Infrastructure
import {
  FcmTokenOrmEntity,
  FcmTokenRepository,
} from '@modules/notification/infrastructure/fcm';

// Event Listeners
import { NotificationEventListener } from '@modules/notification/application/domain/event-listeners';

@Module({
  imports: [
    TypeOrmModule.forFeature([...OrmEntities, FcmTokenOrmEntity]),
    CqrsModule,
    SharedModule, // For PUSH_GATEWAY access
    UserPreferencesModule, // For notification preferences
  ],
  providers: [
    ...CommandHandlers,
    ...Queries,
    ...Repositories,
    ...Mappers,
    ...UseCases,
    ...Services,
    // FCM Token Repository
    FcmTokenRepository,
    // Event Listeners
    NotificationEventListener,
  ],
  controllers: [...Controllers],
  exports: [...Services], // Export NotificationService and PushNotificationService for use in other modules
})
export class NotificationModule {}
