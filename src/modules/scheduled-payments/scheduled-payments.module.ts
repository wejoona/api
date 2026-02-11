/**
 * Scheduled Payments Module
 * Handles scheduled and recurring payment functionality
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { ScheduledPaymentService } from './application/services/scheduled-payment.service';

// Repositories
import { ScheduleRepository } from './infrastructure/repositories/schedule.repository';
import { ExecutionRepository } from './infrastructure/repositories/execution.repository';

// Controllers
import { ScheduledPaymentController } from './application/controllers/scheduled-payment.controller';

// External modules
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot(), forwardRef(() => WalletModule), forwardRef(() => UserModule)],
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
