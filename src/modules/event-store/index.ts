/**
 * Event Store Module - Public API
 *
 * Provides event sourcing capabilities for JoonaPay USDC Wallet
 *
 * @module EventStore
 */

// Module
export { EventStoreModule } from './event-store.module';

// Services
export {
  EventStoreService,
  EventReplayService,
  ProjectionBuilderService,
  IProjectionHandler,
} from './application/services';

// Projection Handlers
export {
  TransactionHistoryProjection,
  WalletBalanceProjection,
  AuditTrailProjection,
} from './application/services/projections';

// Domain Entities
export {
  Event,
  EventProps,
  EventMetadata,
  Snapshot,
  SnapshotProps,
  Projection,
  ProjectionProps,
} from './domain/entities';

// Repositories
export {
  EventStoreRepository,
  ProjectionRepository,
} from './domain/repositories';

// Domain Events
export {
  EventStoreEvent,
  EventAppendedEvent,
  EventsBatchAppendedEvent,
  SnapshotCreatedEvent,
  ProjectionUpdatedEvent,
  ProjectionRebuildStartedEvent,
  ProjectionRebuildCompletedEvent,
  EventReplayStartedEvent,
  EventReplayCompletedEvent,
  EventAppendFailedEvent,
  ProjectionUpdateFailedEvent,
} from './domain/events';

// DTOs
export {
  AppendEventDto,
  ReplayEventsDto,
  GetEventsByAggregateDto,
  GetEventsByTypeDto,
  GetEventsByTimeRangeDto,
  GetEventsByCorrelationDto,
  RebuildProjectionDto,
  GetProjectionDto,
} from './application/dto';

// Controllers (for reference)
export { EventStoreController } from './application/controllers';
