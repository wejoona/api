import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { EventStoreService } from '../services/event-store.service';
import { EventReplayService } from '../services/event-replay.service';
import { ProjectionBuilderService } from '../services/projection-builder.service';
import {
  AppendEventDto,
  ReplayEventsDto,
  GetEventsByAggregateDto,
  GetEventsByTypeDto,
  GetEventsByTimeRangeDto,
  GetEventsByCorrelationDto,
  RebuildProjectionDto,
  GetProjectionDto,
} from '../dto';

/**
 * Event Store Controller
 * Provides HTTP endpoints for event sourcing operations
 * Note: These should be protected with admin-only guards in production
 */
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Event Store')
@Controller('event-store')
export class EventStoreController {
  constructor(
    private readonly eventStoreService: EventStoreService,
    private readonly eventReplayService: EventReplayService,
    private readonly projectionBuilderService: ProjectionBuilderService,
  ) {}

  /**
   * Append a new event (typically called by internal services, not exposed publicly)
   */
  @Post('events')
  async appendEvent(@Body() dto: AppendEventDto) {
    return this.eventStoreService.appendEvent({
      aggregateId: dto.aggregateId,
      aggregateType: dto.aggregateType,
      eventType: dto.eventType,
      eventData: dto.eventData,
      metadata: dto.metadata || {},
      version: dto.version,
      correlationId: dto.correlationId,
      causationId: dto.causationId,
    });
  }

  /**
   * Get event stream for an aggregate
   */
  @Get('events/aggregate')
  async getEventsByAggregate(@Query() query: GetEventsByAggregateDto) {
    return this.eventStoreService.getEventStream(
      query.aggregateId,
      query.aggregateType,
      query.fromVersion,
    );
  }

  /**
   * Get events by type
   */
  @Get('events/type')
  async getEventsByType(@Query() query: GetEventsByTypeDto) {
    return this.eventStoreService.getEventsByType(
      query.eventType,
      query.limit,
      query.offset,
    );
  }

  /**
   * Get events by correlation ID
   */
  @Get('events/correlation/:correlationId')
  async getEventsByCorrelation(@Param() params: GetEventsByCorrelationDto) {
    return this.eventStoreService.getEventsByCorrelationId(
      params.correlationId,
    );
  }

  /**
   * Get events by time range
   */
  @Get('events/time-range')
  async getEventsByTimeRange(@Query() query: GetEventsByTimeRangeDto) {
    return this.eventStoreService.getEventsByTimeRange(
      new Date(query.startTime),
      new Date(query.endTime),
      query.aggregateType,
    );
  }

  /**
   * Get latest event for aggregate
   */
  @Get('events/aggregate/:aggregateId/:aggregateType/latest')
  async getLatestEvent(
    @Param('aggregateId') aggregateId: string,
    @Param('aggregateType') aggregateType: string,
  ) {
    return this.eventStoreService.getLatestEvent(aggregateId, aggregateType);
  }

  /**
   * Get event count for aggregate
   */
  @Get('events/aggregate/:aggregateId/:aggregateType/count')
  async getEventCount(
    @Param('aggregateId') aggregateId: string,
    @Param('aggregateType') aggregateType: string,
  ) {
    const count = await this.eventStoreService.getEventCount(
      aggregateId,
      aggregateType,
    );
    return { count };
  }

  /**
   * Replay events for an aggregate
   */
  @Post('replay')
  async replayEvents(@Body() dto: ReplayEventsDto) {
    return this.eventReplayService.replayAggregate(
      dto.aggregateId,
      dto.aggregateType,
      dto.fromVersion,
      dto.toVersion,
    );
  }

  /**
   * Get latest snapshot
   */
  @Get('snapshots/:aggregateId/:aggregateType/latest')
  async getLatestSnapshot(
    @Param('aggregateId') aggregateId: string,
    @Param('aggregateType') aggregateType: string,
  ) {
    return this.eventStoreService.getLatestSnapshot(aggregateId, aggregateType);
  }

  /**
   * Get projection
   */
  @Get('projections')
  async getProjection(@Query() query: GetProjectionDto) {
    return this.projectionBuilderService.getProjection(
      query.projectionName,
      query.aggregateId,
    );
  }

  /**
   * Get all projections by name
   */
  @Get('projections/:projectionName/all')
  async getAllProjections(@Param('projectionName') projectionName: string) {
    return this.projectionBuilderService.getAllProjections(projectionName);
  }

  /**
   * Rebuild projection
   */
  @Post('projections/rebuild')
  async rebuildProjection(@Body() dto: RebuildProjectionDto) {
    return this.projectionBuilderService.rebuildProjection(
      dto.projectionName,
      dto.aggregateId,
      dto.aggregateType,
    );
  }
}
