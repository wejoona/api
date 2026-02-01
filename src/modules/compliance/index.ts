/**
 * Compliance Module Exports
 *
 * BCEAO Compliance Engine for JoonaPay USDC Wallet
 */

// Module
export * from './compliance.module';

// Types
export * from './domain/compliance.types';

// Services - explicitly exclude duplicates
export { BCEAOReportingService } from './application/services/bceao-reporting.service';
export { AMLCFTService } from './application/services/aml-cft.service';
export { SARGeneratorService } from './application/services/sar-generator.service';
export { ComplianceDashboardService } from './application/services/compliance-dashboard.service';
export { VelocityRuleService } from './application/services/velocity-rule.service';
export { WatchlistScreeningService } from './application/services/watchlist-screening.service';
export { FraudRingDetectionService } from './application/services/fraud-ring-detection.service';
export { ComplianceCaseService } from './application/services/compliance-case.service';

// Controllers
export * from './application/controllers';

// DTOs - explicitly to handle WatchlistListType/WatchlistMatchStatus duplicates
export { CreateManualSARDto } from './application/dto/create-sar.dto';
export {
  UpdateSARInvestigationDto,
  CloseSARDto,
} from './application/dto/update-sar.dto';
export {
  GenerateAdHocReportDto,
  ApproveReportDto,
} from './application/dto/generate-report.dto';
export { ResolveAlertDto } from './application/dto/resolve-alert.dto';
export {
  CreateVelocityRuleDto,
  UpdateVelocityRuleDto,
  VelocityRuleResponseDto,
} from './application/dto/velocity-rule.dto';
export {
  WatchlistListType,
  WatchlistMatchStatus,
  CreateWatchlistEntryDto,
  UpdateWatchlistEntryDto,
  ScreenUserDto,
  ScreenTransactionDto,
  ReviewMatchDto,
  SearchWatchlistEntriesDto,
  GetPendingMatchesDto,
  BulkImportEntriesDto,
  ScreeningResultResponse,
  MatchStatisticsResponse,
  WatchlistEntryResponse,
  WatchlistMatchResponse,
} from './application/dto/watchlist.dto';
export {
  CreateCaseDto,
  UpdateCaseDto,
  AddCaseNoteDto,
  AddCaseEvidenceDto,
  CaseResponseDto,
} from './application/dto/compliance-case.dto';

// ORM Entities - exclude types that conflict with DTOs
export { ComplianceReportOrmEntity } from './infrastructure/orm-entities/compliance-report.orm-entity';
export { SuspiciousActivityReportOrmEntity } from './infrastructure/orm-entities/suspicious-activity-report.orm-entity';
export { ComplianceAlertOrmEntity } from './infrastructure/orm-entities/compliance-alert.orm-entity';
export { VelocityRuleOrmEntity } from './infrastructure/orm-entities/velocity-rule.orm-entity';
export { WatchlistEntryOrmEntity } from './infrastructure/orm-entities/watchlist-entry.orm-entity';
export { WatchlistMatchOrmEntity } from './infrastructure/orm-entities/watchlist-match.orm-entity';
export { FraudRingDetectionOrmEntity } from './infrastructure/orm-entities/fraud-ring-detection.orm-entity';
export { ComplianceCaseOrmEntity } from './infrastructure/orm-entities/compliance-case.orm-entity';
export { CaseNoteOrmEntity } from './infrastructure/orm-entities/case-note.orm-entity';
export { CaseEvidenceOrmEntity } from './infrastructure/orm-entities/case-evidence.orm-entity';
