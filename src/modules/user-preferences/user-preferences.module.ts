import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { NotificationPreferencesOrmEntity } from './infrastructure/orm-entities';

// Repositories
import { NotificationPreferencesRepository } from './infrastructure/repositories';

// Use Cases
import {
  GetNotificationPreferencesUsecase,
  UpdateNotificationPreferencesUsecase,
} from './application/domain/usecases';

// Controllers
import { NotificationPreferencesController } from './application/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPreferencesOrmEntity])],
  controllers: [NotificationPreferencesController],
  providers: [
    // Repository
    NotificationPreferencesRepository,
    // Use Cases
    GetNotificationPreferencesUsecase,
    UpdateNotificationPreferencesUsecase,
  ],
  exports: [NotificationPreferencesRepository],
})
export class UserPreferencesModule {}
