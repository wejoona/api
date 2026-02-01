import { Projection } from '../entities/projection.entity';

/**
 * Projection Repository Interface
 * Manages materialized views built from events
 */
export abstract class ProjectionRepository {
  /**
   * Find projection by name and optional aggregate ID
   */
  abstract findByName(
    name: string,
    aggregateId?: string,
  ): Promise<Projection | null>;

  /**
   * Find all projections by name
   */
  abstract findAllByName(name: string): Promise<Projection[]>;

  /**
   * Save or update projection
   */
  abstract save(projection: Projection): Promise<Projection>;

  /**
   * Delete projection
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Delete all projections by name (for rebuilding)
   */
  abstract deleteAllByName(name: string): Promise<void>;

  /**
   * Get projection by ID
   */
  abstract findById(id: string): Promise<Projection | null>;

  /**
   * Find projections that need updating
   */
  abstract findOutdated(
    name: string,
    beforeEventId: string,
  ): Promise<Projection[]>;
}
