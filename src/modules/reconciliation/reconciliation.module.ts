import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// ORM Entities
import { ReconciliationReportOrmEntity } from './infrastructure/orm-entities/reconciliation-report.orm-entity';

// Repositories
import { ReconciliationReportRepository } from './domain/repositories/reconciliation-report.repository';
import { TypeOrmReconciliationReportRepository } from './infrastructure/repositories/typeorm-reconciliation-report.repository';

// Mappers
import { ReconciliationReportMapper } from './infrastructure/mappers/reconciliation-report.mapper';

// Services
import {
  DailyTransactionReconciliationService,
  ProviderBalanceReconciliationService,
  FeeVerificationService,
  SettlementReportService,
} from './application/services';

// Event Listeners
import { ReconciliationAlertListener } from './application/usecases/reconciliation-alert.listener';

// Controllers
import { ReconciliationController } from './application/controllers/reconciliation.controller';

// Related Modules
import { TransactionModule } from '../transaction/transaction.module';
import { WalletModule } from '../wallet/wallet.module';

/**
 * Reconciliation Module
 *
 * Provides comprehensive financial reconciliation capabilities:
 *
 * 1. Daily Transaction Reconciliation
 *    - Matches internal transactions with ledger entries
 *    - Detects missing or mismatched transactions
 *    - Runs daily at 1:00 AM or on-demand
 *
 * 2. Provider Balance Matching
 *    - Compares database balances with Blnk ledger
 *    - Verifies Circle wallet balances
 *    - Runs every 4 hours or on-demand
 *
 * 3. Fee Calculation Verification
 *    - Validates fees against fee schedules
 *    - Detects overcharging or undercharging
 *    - Runs daily at 2:00 AM or on-demand
 *
 * 4. Settlement Reports
 *    - Generates daily/weekly/monthly settlement summaries
 *    - Tracks volume by provider
 *    - Breaks down fees (platform, provider, network)
 *    - Runs daily at 3:00 AM or on-demand
 *
 * Security:
 * - Admin/Finance team access only (RolesGuard)
 * - Audit trail for all reconciliation activities
 * - Alerts for critical discrepancies
 *
 * Events Emitted:
 * - reconciliation.started
 * - reconciliation.completed
 * - reconciliation.failed
 * - reconciliation.critical_discrepancy
 * - reconciliation.provider_balance_mismatch
 * - reconciliation.settlement_generated
 * - reconciliation.requires_review
 * - reconciliation.daily_summary
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReconciliationReportOrmEntity]),
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]),
    EventEmitterModule.forRoot(),
    forwardRef(() => TransactionModule),
    forwardRef(() => WalletModule),
    // Note: BlnkModule is @Global() so LEDGER_PROVIDER and WALLET_PROVIDER are available
  ],
  providers: [
    // Mappers
    ReconciliationReportMapper,

    // Repository implementation
    {
      provide: ReconciliationReportRepository,
      useClass: TypeOrmReconciliationReportRepository,
    },

    // Services
    DailyTransactionReconciliationService,
    ProviderBalanceReconciliationService,
    FeeVerificationService,
    SettlementReportService,

    // Event Listeners
    ReconciliationAlertListener,
  ],
  controllers: [ReconciliationController],
  exports: [
    ReconciliationReportRepository,
    DailyTransactionReconciliationService,
    ProviderBalanceReconciliationService,
    FeeVerificationService,
    SettlementReportService,
  ],
})
export class ReconciliationModule {}
