import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { EventStoreController } from './application/controllers';

// Services
import {
  EventStoreService,
  EventReplayService,
  ProjectionBuilderService,
} from './application/services';

// Projection Handlers
import {
  TransactionHistoryProjection,
  WalletBalanceProjection,
  AuditTrailProjection,
} from './application/services/projections';

// Repositories
import {
  EventStoreRepository,
  ProjectionRepository,
} from './domain/repositories';
import {
  TypeOrmEventStoreRepository,
  TypeOrmProjectionRepository,
} from './infrastructure/repositories';

// ORM Entities
import {
  EventOrmEntity,
  SnapshotOrmEntity,
  ProjectionOrmEntity,
} from './infrastructure/orm-entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventOrmEntity,
      SnapshotOrmEntity,
      ProjectionOrmEntity,
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [EventStoreController],
  providers: [
    // Services
    EventStoreService,
    EventReplayService,
    ProjectionBuilderService,

    // Projection Handlers
    TransactionHistoryProjection,
    WalletBalanceProjection,
    AuditTrailProjection,

    // Repository Providers
    {
      provide: EventStoreRepository,
      useClass: TypeOrmEventStoreRepository,
    },
    {
      provide: ProjectionRepository,
      useClass: TypeOrmProjectionRepository,
    },
  ],
  exports: [
    EventStoreService,
    EventReplayService,
    ProjectionBuilderService,
    EventStoreRepository,
    ProjectionRepository,
  ],
})
export class EventStoreModule {
  constructor(
    private readonly projectionBuilder: ProjectionBuilderService,
    private readonly transactionHistoryProjection: TransactionHistoryProjection,
    private readonly walletBalanceProjection: WalletBalanceProjection,
    private readonly auditTrailProjection: AuditTrailProjection,
  ) {
    // Register projection handlers on module initialization
    this.registerProjectionHandlers();
  }

  private registerProjectionHandlers(): void {
    this.projectionBuilder.registerHandler(this.transactionHistoryProjection);
    this.projectionBuilder.registerHandler(this.walletBalanceProjection);
    this.projectionBuilder.registerHandler(this.auditTrailProjection);
  }
}
