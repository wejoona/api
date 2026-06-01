import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { KycVerificationOrmEntity } from '../kyc/infrastructure/orm-entities/kyc-verification.orm-entity';

// Entities
import {
  ComplianceReportOrmEntity,
  SuspiciousActivityReportOrmEntity,
  ComplianceAlertOrmEntity,
  VelocityRuleOrmEntity,
  WatchlistEntryOrmEntity,
  WatchlistMatchOrmEntity,
  ComplianceCaseOrmEntity,
  CaseNoteOrmEntity,
  CaseEvidenceOrmEntity,
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
  VelocityRuleService,
  WatchlistScreeningService,
  ComplianceCaseService,
} from './application/services';

// Controllers
import {
  ComplianceController,
  VelocityRuleController,
  ComplianceCaseController,
} from './application/controllers';

// Repositories
import { VelocityRuleRepository } from './domain/repositories/velocity-rule.repository';
import { TypeOrmVelocityRuleRepository } from './infrastructure/repositories/typeorm-velocity-rule.repository';
import { WatchlistRepository } from './domain/repositories/watchlist.repository';
import { TypeOrmWatchlistRepository } from './infrastructure/repositories/typeorm-watchlist.repository';
import { ComplianceCaseRepository } from './domain/repositories/compliance-case.repository';
import { TypeOrmComplianceCaseRepository } from './infrastructure/repositories/typeorm-compliance-case.repository';

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
      VelocityRuleOrmEntity,
      WatchlistEntryOrmEntity,
      WatchlistMatchOrmEntity,
      ComplianceCaseOrmEntity,
      CaseNoteOrmEntity,
      CaseEvidenceOrmEntity,
      // External entities
      TransactionOrmEntity,
      UserOrmEntity,
      KycVerificationOrmEntity,
    ]),
    ConfigModule,
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]), // Enable cron jobs
    EventEmitterModule.forRoot(), // Enable event emission
  ],
  controllers: [
    ComplianceController,
    VelocityRuleController,
    ComplianceCaseController,
  ],
  providers: [
    BCEAOReportingService,
    AMLCFTService,
    SARGeneratorService,
    ComplianceDashboardService,
    VelocityRuleService,
    WatchlistScreeningService,
    ComplianceCaseService,
    TransactionScreeningGuard,
    {
      provide: VelocityRuleRepository,
      useClass: TypeOrmVelocityRuleRepository,
    },
    {
      provide: WatchlistRepository,
      useClass: TypeOrmWatchlistRepository,
    },
    {
      provide: ComplianceCaseRepository,
      useClass: TypeOrmComplianceCaseRepository,
    },
  ],
  exports: [
    BCEAOReportingService,
    AMLCFTService,
    SARGeneratorService,
    ComplianceDashboardService,
    VelocityRuleService,
    WatchlistScreeningService,
    ComplianceCaseService,
    VelocityRuleRepository,
    WatchlistRepository,
    ComplianceCaseRepository,
    TransactionScreeningGuard,
  ],
})
export class ComplianceModule {}
