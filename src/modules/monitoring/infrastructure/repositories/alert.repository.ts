/**
 * Alert Repository
 * Database operations for transaction alerts
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { AlertOrmEntity } from '../orm-entities/alert.orm-entity';
import {
  TransactionAlert,
  AlertFilterOptions,
  PaginationOptions,
  PaginatedAlerts,
  AlertType,
  AlertSeverity,
} from '../../domain/interfaces/monitoring.types';

@Injectable()
export class AlertRepository {
  private readonly repository: Repository<AlertOrmEntity>;
  private readonly logger = new Logger(AlertRepository.name);

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(AlertOrmEntity);
  }

  /**
   * Create a new alert
   */
  async create(alert: TransactionAlert): Promise<TransactionAlert> {
    const entity = this.toEntity(alert);
    const saved = await this.repository.save(entity);
    this.logger.log(`Created alert ${saved.alertId} for user ${saved.userId}`);
    return this.toDomain(saved);
  }

  /**
   * Create multiple alerts
   */
  async createMany(alerts: TransactionAlert[]): Promise<TransactionAlert[]> {
    const entities = alerts.map((a) => this.toEntity(a));
    const saved = await this.repository.save(entities);
    return saved.map((e) => this.toDomain(e));
  }

  /**
   * Find alert by ID
   */
  async findById(alertId: string): Promise<TransactionAlert | null> {
    const entity = await this.repository.findOne({ where: { alertId } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find alert by ID for a specific user
   */
  async findByIdAndUser(
    alertId: string,
    userId: string,
  ): Promise<TransactionAlert | null> {
    const entity = await this.repository.findOne({
      where: { alertId, userId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find alerts with filtering and pagination
   */
  async findWithFilters(
    filters: AlertFilterOptions,
    pagination: PaginationOptions,
  ): Promise<PaginatedAlerts> {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('alert');

    // Apply filters
    if (filters.userId) {
      queryBuilder.andWhere('alert.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters.alertTypes && filters.alertTypes.length > 0) {
      queryBuilder.andWhere('alert.alertType IN (:...alertTypes)', {
        alertTypes: filters.alertTypes,
      });
    }

    if (filters.severities && filters.severities.length > 0) {
      queryBuilder.andWhere('alert.severity IN (:...severities)', {
        severities: filters.severities,
      });
    }

    if (filters.isRead !== undefined) {
      queryBuilder.andWhere('alert.isRead = :isRead', {
        isRead: filters.isRead,
      });
    }

    if (filters.isActionRequired !== undefined) {
      queryBuilder.andWhere('alert.isActionRequired = :isActionRequired', {
        isActionRequired: filters.isActionRequired,
      });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('alert.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('alert.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    if (filters.transactionId) {
      queryBuilder.andWhere('alert.transactionId = :transactionId', {
        transactionId: filters.transactionId,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting and pagination
    queryBuilder.orderBy(`alert.${sortBy}`, sortOrder).skip(skip).take(limit);

    const entities = await queryBuilder.getMany();
    const alerts = entities.map((e) => this.toDomain(e));

    const totalPages = Math.ceil(total / limit);

    return {
      alerts,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Find unread alerts for user
   */
  async findUnreadByUser(
    userId: string,
    limit = 50,
  ): Promise<TransactionAlert[]> {
    const entities = await this.repository.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Find alerts requiring action for user
   */
  async findActionRequiredByUser(userId: string): Promise<TransactionAlert[]> {
    const entities = await this.repository.find({
      where: { userId, isActionRequired: true, actionTaken: null as any },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, isRead: false } });
  }

  /**
   * Get alert statistics for user
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    critical: number;
    actionRequired: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const stats = await this.repository
      .createQueryBuilder('alert')
      .select([
        'COUNT(*) as total',
        'SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread',
        "SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical",
        'SUM(CASE WHEN is_action_required = true AND action_taken IS NULL THEN 1 ELSE 0 END) as action_required',
      ])
      .where('alert.userId = :userId', { userId })
      .getRawOne();

    const byTypeResult = await this.repository
      .createQueryBuilder('alert')
      .select(['alert.alertType as type', 'COUNT(*) as count'])
      .where('alert.userId = :userId', { userId })
      .groupBy('alert.alertType')
      .getRawMany();

    const bySeverityResult = await this.repository
      .createQueryBuilder('alert')
      .select(['alert.severity as severity', 'COUNT(*) as count'])
      .where('alert.userId = :userId', { userId })
      .groupBy('alert.severity')
      .getRawMany();

    const byType: Record<string, number> = {};
    byTypeResult.forEach((r) => {
      byType[r.type] = parseInt(r.count, 10);
    });

    const bySeverity: Record<string, number> = {};
    bySeverityResult.forEach((r) => {
      bySeverity[r.severity] = parseInt(r.count, 10);
    });

    return {
      total: parseInt(stats.total, 10) || 0,
      unread: parseInt(stats.unread, 10) || 0,
      critical: parseInt(stats.critical, 10) || 0,
      actionRequired: parseInt(stats.action_required, 10) || 0,
      byType,
      bySeverity,
    };
  }

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string, userId: string): Promise<void> {
    await this.repository.update(
      { alertId, userId },
      { isRead: true, updatedAt: new Date() },
    );
  }

  /**
   * Mark all alerts as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repository.update(
      { userId, isRead: false },
      { isRead: true, updatedAt: new Date() },
    );
    return result.affected || 0;
  }

  /**
   * Record action taken on alert
   */
  async recordAction(
    alertId: string,
    userId: string,
    action: string,
  ): Promise<TransactionAlert | null> {
    await this.repository.update(
      { alertId, userId },
      {
        actionTaken: action,
        actionTakenAt: new Date(),
        isActionRequired: false,
        isRead: true,
        updatedAt: new Date(),
      },
    );
    return this.findByIdAndUser(alertId, userId);
  }

  /**
   * Delete old alerts (cleanup job)
   */
  async deleteOldAlerts(beforeDate: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(beforeDate),
    });
    return result.affected || 0;
  }

  /**
   * Find recent alerts for admin dashboard
   */
  async findRecentAlerts(
    limit = 100,
    severity?: AlertSeverity,
  ): Promise<TransactionAlert[]> {
    const where: any = {};
    if (severity) {
      where.severity = severity;
    }

    const entities = await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  /**
   * Get alert count by type in time range
   */
  async getAlertCountByType(
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, number>> {
    const results = await this.repository
      .createQueryBuilder('alert')
      .select(['alert.alertType as type', 'COUNT(*) as count'])
      .where('alert.createdAt BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .groupBy('alert.alertType')
      .getRawMany();

    const counts: Record<string, number> = {};
    results.forEach((r) => {
      counts[r.type] = parseInt(r.count, 10);
    });
    return counts;
  }

  // Mapping methods
  private toEntity(alert: TransactionAlert): AlertOrmEntity {
    const entity = new AlertOrmEntity();
    entity.alertId = alert.alertId;
    entity.userId = alert.userId;
    entity.transactionId = alert.transactionId || null;
    entity.alertType = alert.alertType;
    entity.severity = alert.severity;
    entity.title = alert.title;
    entity.message = alert.message;
    entity.metadata = alert.metadata;
    entity.isRead = alert.isRead;
    entity.isActionRequired = alert.isActionRequired;
    entity.actionTaken = alert.actionTaken || null;
    entity.actionTakenAt = alert.actionTakenAt || null;
    entity.expiresAt = alert.expiresAt || null;
    entity.createdAt = alert.createdAt;
    entity.updatedAt = alert.updatedAt;
    return entity;
  }

  private toDomain(entity: AlertOrmEntity): TransactionAlert {
    return {
      alertId: entity.alertId,
      userId: entity.userId,
      transactionId: entity.transactionId || undefined,
      alertType: entity.alertType as AlertType,
      severity: entity.severity as AlertSeverity,
      title: entity.title,
      message: entity.message,
      metadata: entity.metadata,
      isRead: entity.isRead,
      isActionRequired: entity.isActionRequired,
      actionTaken: entity.actionTaken as any,
      actionTakenAt: entity.actionTakenAt || undefined,
      expiresAt: entity.expiresAt || undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
