import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import {
  ComplianceReportOrmEntity,
  SuspiciousActivityReportOrmEntity,
  ComplianceAlertOrmEntity,
} from './infrastructure/orm-entities';

// External entities
import { TransactionOrmEntity } from '../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../user/infrastructure/orm-entities/user.orm-entity';

// Services
import {
  BCEAOReportingService,
  AMLCFTService,
  SARGeneratorService,
  ComplianceDashboardService,
} from './application/services';

// Controllers
import { ComplianceController } from './application/controllers';

// Guards
import { TransactionScreeningGuard } from './application/guards';

/**
 * Compliance Module
 *
 * BCEAO (Central Bank of West African States) Compliance Engine
 *
 * Features:
 * - Automated BCEAO reporting (daily, weekly, monthly)
 * - AML/CFT transaction screening
 * - Suspicious Activity Report (SAR) generation
 * - Real-time compliance alerts
 * - Compliance dashboard and analytics
 *
 * Regulatory Framework:
 * - BCEAO directives for financial institutions
 * - FATF recommendations (R.10, R.11, R.20, R.21)
 * - WAEMU/UEMOA AML/CFT standards
 *
 * Integration Points:
 * - Transaction monitoring (real-time screening)
 * - User KYC verification
 * - Risk scoring engine
 * - Administrative dashboard
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Compliance entities
      ComplianceReportOrmEntity,
      SuspiciousActivityReportOrmEntity,
      ComplianceAlertOrmEntity,
      // External entities
      TransactionOrmEntity,
      UserOrmEntity,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(), // Enable cron jobs
    EventEmitterModule.forRoot(), // Enable event emission
  ],
  controllers: [ComplianceController],
  providers: [
    BCEAOReportingService,
    AMLCFTService,
    SARGeneratorService,
    ComplianceDashboardService,
    TransactionScreeningGuard,
  ],
  exports: [
    BCEAOReportingService,
    AMLCFTService,
    SARGeneratorService,
    ComplianceDashboardService,
    TransactionScreeningGuard,
  ],
})
export class ComplianceModule {}
