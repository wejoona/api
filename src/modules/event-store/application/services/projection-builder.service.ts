import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectionRepository } from '../../domain/repositories/projection.repository';
import { EventStoreRepository } from '../../domain/repositories/event-store.repository';
import { Projection } from '../../domain/entities/projection.entity';
import { Event } from '../../domain/entities/event.entity';
import {
  ProjectionUpdatedEvent,
  ProjectionRebuildStartedEvent,
  ProjectionRebuildCompletedEvent,
  ProjectionUpdateFailedEvent,
} from '../../domain/events';

/**
 * Projection Handler Interface
 * Defines how to build projections from events
 */
export interface IProjectionHandler {
  readonly projectionName: string;
  readonly eventTypes: string[];

  /**
   * Build initial projection data from event
   */
  buildInitial(event: Event): Record<string, any>;

  /**
   * Update projection data with new event
   */
  apply(currentData: Record<string, any>, event: Event): Record<string, any>;
}

/**
 * Projection Builder Service
 * Manages building and updating projections from event streams
 */
@Injectable()
export class ProjectionBuilderService {
  private readonly logger = new Logger(ProjectionBuilderService.name);
  private readonly handlers = new Map<string, IProjectionHandler>();

  constructor(
    private readonly projectionRepository: ProjectionRepository,
    private readonly eventStoreRepository: EventStoreRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Register a projection handler
   */
  registerHandler(handler: IProjectionHandler): void {
    this.handlers.set(handler.projectionName, handler);
    this.logger.log(`Registered projection handler: ${handler.projectionName}`);
  }

  /**
   * Update projection with a new event
   */
  async updateProjection(
    projectionName: string,
    event: Event,
    aggregateId?: string,
  ): Promise<Projection> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      throw new Error(
        `No handler registered for projection: ${projectionName}`,
      );
    }

    try {
      // Find existing projection
      const existing = await this.projectionRepository.findByName(
        projectionName,
        aggregateId || event.aggregateId,
      );

      let projection: Projection;

      if (existing) {
        // Update existing projection
        const updatedData = handler.apply(existing.data, event);
        projection = existing.update(updatedData, event.id, event.version);
      } else {
        // Create new projection
        const initialData = handler.buildInitial(event);
        projection = Projection.create({
          name: projectionName,
          aggregateId: aggregateId || event.aggregateId,
          aggregateType: event.aggregateType,
          data: initialData,
          lastEventId: event.id,
          lastEventVersion: event.version,
        });
      }

      const saved = await this.projectionRepository.save(projection);

      this.eventEmitter.emit(
        'event_store.projection_updated',
        new ProjectionUpdatedEvent(saved, 1),
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to update projection ${projectionName}: ${error.message}`,
        error.stack,
      );

      this.eventEmitter.emit(
        'event_store.projection_update_failed',
        new ProjectionUpdateFailedEvent(
          projectionName,
          event.id,
          error.message,
        ),
      );

      throw error;
    }
  }

  /**
   * Rebuild projection from event stream
   */
  async rebuildProjection(
    projectionName: string,
    aggregateId: string,
    aggregateType: string,
  ): Promise<Projection> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      throw new Error(
        `No handler registered for projection: ${projectionName}`,
      );
    }

    const startTime = Date.now();

    this.logger.log(
      `Starting rebuild of projection: ${projectionName} for ${aggregateType}:${aggregateId}`,
    );

    this.eventEmitter.emit(
      'event_store.projection_rebuild_started',
      new ProjectionRebuildStartedEvent(projectionName),
    );

    // Delete existing projection
    const existing = await this.projectionRepository.findByName(
      projectionName,
      aggregateId,
    );
    if (existing) {
      await this.projectionRepository.delete(existing.id);
    }

    // Get all events for aggregate
    const events = await this.eventStoreRepository.getEventsByAggregate(
      aggregateId,
      aggregateType,
    );

    // Filter events by handler's event types
    const relevantEvents = events.filter((event) =>
      handler.eventTypes.includes(event.eventType),
    );

    if (relevantEvents.length === 0) {
      throw new Error(
        `No relevant events found for projection: ${projectionName}`,
      );
    }

    // Build projection from events
    let data = handler.buildInitial(relevantEvents[0]);
    for (let i = 1; i < relevantEvents.length; i++) {
      data = handler.apply(data, relevantEvents[i]);
    }

    const lastEvent = relevantEvents[relevantEvents.length - 1];
    const projection = Projection.create({
      name: projectionName,
      aggregateId,
      aggregateType,
      data,
      lastEventId: lastEvent.id,
      lastEventVersion: lastEvent.version,
    });

    const saved = await this.projectionRepository.save(projection);

    const duration = Date.now() - startTime;

    this.logger.log(
      `Completed rebuild of projection ${projectionName} with ${relevantEvents.length} events in ${duration}ms`,
    );

    this.eventEmitter.emit(
      'event_store.projection_rebuild_completed',
      new ProjectionRebuildCompletedEvent(
        projectionName,
        relevantEvents.length,
        duration,
      ),
    );

    return saved;
  }

  /**
   * Rebuild all projections for a specific name
   */
  async rebuildAllProjections(projectionName: string): Promise<void> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      throw new Error(
        `No handler registered for projection: ${projectionName}`,
      );
    }

    this.logger.log(
      `Starting full rebuild of all ${projectionName} projections`,
    );

    // Delete all existing projections
    await this.projectionRepository.deleteAllByName(projectionName);

    // This would need to iterate through all aggregates
    // Implementation depends on specific requirements
    this.logger.warn(`Full rebuild not yet implemented for: ${projectionName}`);
  }

  /**
   * Get projection data
   */
  async getProjection(
    projectionName: string,
    aggregateId?: string,
  ): Promise<Projection | null> {
    return this.projectionRepository.findByName(projectionName, aggregateId);
  }

  /**
   * Get all projections by name
   */
  async getAllProjections(projectionName: string): Promise<Projection[]> {
    return this.projectionRepository.findAllByName(projectionName);
  }
}
