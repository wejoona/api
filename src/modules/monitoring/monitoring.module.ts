/**
 * Monitoring Module
 * Real-time transaction monitoring and alerts system
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// ORM Entities
import {
  AlertOrmEntity,
  UserAlertPreferencesOrmEntity,
  MonitoringRuleOrmEntity,
} from './infrastructure/orm-entities';

// Repositories
import {
  AlertRepository,
  UserAlertPreferencesRepository,
  MonitoringRuleRepository,
} from './infrastructure/repositories';

// Services
import {
  AlertRulesService,
  TransactionMonitorService,
  AlertNotificationService,
} from './application/services';

// Listeners
import { TransactionEventListener } from './application/listeners';

// Use Cases
import { UserAlertPreferencesUseCase } from './application/usecases';

// Controllers
import { MonitoringController } from './application/controllers';

// External Module
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlertOrmEntity,
      UserAlertPreferencesOrmEntity,
      MonitoringRuleOrmEntity,
    ]),
    EventEmitterModule.forRoot(),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MonitoringController],
  providers: [
    // Repositories
    AlertRepository,
    UserAlertPreferencesRepository,
    MonitoringRuleRepository,

    // Services
    AlertRulesService,
    TransactionMonitorService,
    AlertNotificationService,

    // Listeners
    TransactionEventListener,

    // Use Cases
    UserAlertPreferencesUseCase,
  ],
  exports: [
    // Export services that other modules might need
    TransactionMonitorService,
    AlertRulesService,
    AlertRepository,
    UserAlertPreferencesRepository,
  ],
})
export class MonitoringModule {}
