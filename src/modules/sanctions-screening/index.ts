/**
 * Sanctions Screening Module
 *
 * Exports for external module usage
 */

// Module
export { SanctionsScreeningModule } from './sanctions-screening.module';

// Services
export { SanctionsScreeningService } from './application/services/sanctions-screening.service';

// Controllers
export { SanctionsScreeningController } from './application/controllers/sanctions-screening.controller';

// DTOs
export {
  ScreenIndividualDto,
  ScreenEntityDto,
  BatchScreenDto,
  ScreenTransferDto,
  ReviewMatchDto,
  GetStatisticsDto,
} from './application/dto/screening.dto';

// Domain Entities
export { ScreeningRecord } from './domain/entities/screening-record.entity';
export { ScreeningMatch } from './domain/entities/screening-match.entity';

// Repository
export { ScreeningRecordRepository } from './domain/repositories/screening-record.repository';

// Provider Interface
export {
  SanctionsScreeningProvider,
  IndividualScreeningRequest,
  EntityScreeningRequest,
  BatchScreeningRequest,
  ScreeningResult,
  BatchScreeningResult,
  ScreeningMatchDetail,
} from './domain/interfaces/sanctions-screening-provider.interface';

// Providers
export { MockSanctionsProvider } from './infrastructure/providers/mock-sanctions-provider';
export { ComplyAdvantageProvider } from './infrastructure/providers/complyadvantage-provider';
