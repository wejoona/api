// Risk Module Exports
export { RiskModule } from './risk.module';

// Services
export { TransactionRiskService } from './application/services/transaction-risk.service';
export type {
  PreTransactionCheckInput,
  PreTransactionCheckResult,
} from './application/services/transaction-risk.service';

// Guards & Decorators
export {
  RiskAssessmentGuard,
  RiskCheck,
  SkipRiskCheck,
  RISK_CHECK_KEY,
  SKIP_RISK_CHECK_KEY,
} from './application/guards/risk-assessment.guard';
export type { RiskCheckOptions } from './application/guards/risk-assessment.guard';

// Infrastructure
export { RiskClientFactory } from './infrastructure/risk-client.factory';
export { RiskManagerClient } from './infrastructure/clients/risk-manager.client';
export { MockRiskClient } from './infrastructure/clients/mock-risk.client';

// Interfaces & Types
export {
  IRiskClient,
  RISK_CLIENT,
} from './domain/interfaces/risk-client.interface';
export type {
  RiskLevel,
  RiskDecision,
  TransactionAnalysisRequest,
  TransactionAnalysisResult,
  IndividualScreeningRequest,
  EntityScreeningRequest,
  ScreeningResult,
  ScreeningMatch,
  ScreeningStatus,
  MatchConfidence,
  VelocityCheckRequest,
  VelocityCheckResult,
  DeviceFingerprint,
  DeviceFingerprintResult,
  UserRiskProfile,
  FullRiskAssessment,
} from './domain/interfaces/risk-assessment.types';
