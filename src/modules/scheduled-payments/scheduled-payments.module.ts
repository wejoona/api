/**
 * Scheduled Payments Module
 * Handles scheduled and recurring payment functionality
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { ScheduledPaymentService } from './application/services/scheduled-payment.service';

// Repositories
import { ScheduleRepository } from './infrastructure/repositories/schedule.repository';
import { ExecutionRepository } from './infrastructure/repositories/execution.repository';

// Controllers
import { ScheduledPaymentController } from './application/controllers/scheduled-payment.controller';

@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot()],
  controllers: [ScheduledPaymentController],
  providers: [
    // Repositories
    ScheduleRepository,
    ExecutionRepository,

    // Services
    ScheduledPaymentService,
  ],
  exports: [ScheduledPaymentService],
})
export class ScheduledPaymentsModule {}
