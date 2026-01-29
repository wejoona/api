import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FraudRingDetectionOrmEntity,
  FraudRingDetectionType,
  FraudRingDetectionStatus,
  FraudRingIndicators,
  FraudRingEvidence,
} from '../../infrastructure/orm-entities/fraud-ring-detection.orm-entity';

/**
 * DTO for creating a fraud ring detection
 */
export interface CreateFraudRingDetectionDto {
  detectionType: FraudRingDetectionType;
  linkedUserIds: string[];
  linkedWalletIds?: string[];
  detectionScore: number;
  indicators: FraudRingIndicators;
  evidence?: FraudRingEvidence;
  notes?: string;
}

/**
 * DTO for updating a fraud ring detection
 */
export interface UpdateFraudRingDetectionDto {
  status?: FraudRingDetectionStatus;
  assignedTo?: string | null;
  notes?: string;
  evidence?: FraudRingEvidence;
}

/**
 * Filter options for querying detections
 */
export interface FraudRingDetectionFilter {
  status?: FraudRingDetectionStatus | FraudRingDetectionStatus[];
  detectionType?: FraudRingDetectionType;
  assignedTo?: string;
  minScore?: number;
  userId?: string;
  walletId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fraud Ring Detection Service
 *
 * Provides functionality for logging and managing fraud ring detections.
 * Integrates with the compliance module for AML/CFT reporting.
 *
 * Detection Types:
 * - network: Shared devices, IPs, beneficiaries indicating coordinated activity
 * - velocity: Unusual transaction timing/amounts across multiple accounts
 * - pattern: Similar behavioral patterns suggesting coordinated fraud
 */
@Injectable()
export class FraudRingDetectionService {
  private readonly logger = new Logger(FraudRingDetectionService.name);

  constructor(
    @InjectRepository(FraudRingDetectionOrmEntity)
    private readonly detectionRepository: Repository<FraudRingDetectionOrmEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Log a new fraud ring detection
   */
  async logDetection(
    dto: CreateFraudRingDetectionDto,
  ): Promise<FraudRingDetectionOrmEntity> {
    const detection = this.detectionRepository.create({
      detectionType: dto.detectionType,
      linkedUserIds: dto.linkedUserIds,
      linkedWalletIds: dto.linkedWalletIds || [],
      detectionScore: dto.detectionScore,
      indicators: dto.indicators,
      evidence: dto.evidence || {},
      notes: dto.notes || null,
      status: 'pending',
    });

    const saved = await this.detectionRepository.save(detection);

    this.logger.warn(
      `Fraud ring detection logged: ${saved.id} | Type: ${saved.detectionType} | Score: ${saved.detectionScore} | Users: ${saved.linkedUserIds.length}`,
    );

    // Emit event for real-time alerting
    this.eventEmitter.emit('compliance.fraud_ring_detected', {
      detectionId: saved.id,
      detectionType: saved.detectionType,
      detectionScore: saved.detectionScore,
      linkedUserIds: saved.linkedUserIds,
      linkedWalletIds: saved.linkedWalletIds,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  /**
   * Get a detection by ID
   */
  async getDetectionById(
    id: string,
  ): Promise<FraudRingDetectionOrmEntity | null> {
    return this.detectionRepository.findOne({ where: { id } });
  }

  /**
   * Find detections by filter criteria
   */
  async findDetections(
    filter: FraudRingDetectionFilter,
  ): Promise<FraudRingDetectionOrmEntity[]> {
    const queryBuilder = this.detectionRepository
      .createQueryBuilder('detection')
      .orderBy('detection.detection_score', 'DESC')
      .addOrderBy('detection.created_at', 'DESC');

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        queryBuilder.andWhere('detection.status IN (:...statuses)', {
          statuses: filter.status,
        });
      } else {
        queryBuilder.andWhere('detection.status = :status', {
          status: filter.status,
        });
      }
    }

    if (filter.detectionType) {
      queryBuilder.andWhere('detection.detection_type = :detectionType', {
        detectionType: filter.detectionType,
      });
    }

    if (filter.assignedTo) {
      queryBuilder.andWhere('detection.assigned_to = :assignedTo', {
        assignedTo: filter.assignedTo,
      });
    }

    if (filter.minScore !== undefined) {
      queryBuilder.andWhere('detection.detection_score >= :minScore', {
        minScore: filter.minScore,
      });
    }

    if (filter.userId) {
      queryBuilder.andWhere(':userId = ANY(detection.linked_user_ids)', {
        userId: filter.userId,
      });
    }

    if (filter.walletId) {
      queryBuilder.andWhere(':walletId = ANY(detection.linked_wallet_ids)', {
        walletId: filter.walletId,
      });
    }

    if (filter.limit) {
      queryBuilder.take(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.skip(filter.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Get pending detections requiring review
   */
  async getPendingDetections(
    limit = 50,
  ): Promise<FraudRingDetectionOrmEntity[]> {
    return this.findDetections({
      status: ['pending', 'investigating'],
      limit,
    });
  }

  /**
   * Update a detection (status, assignment, notes)
   */
  async updateDetection(
    id: string,
    dto: UpdateFraudRingDetectionDto,
  ): Promise<FraudRingDetectionOrmEntity | null> {
    const detection = await this.getDetectionById(id);
    if (!detection) {
      return null;
    }

    const previousStatus = detection.status;

    if (dto.status !== undefined) {
      detection.status = dto.status;

      // Set resolved_at when status changes to confirmed or false_positive
      if (
        (dto.status === 'confirmed' || dto.status === 'false_positive') &&
        !detection.resolvedAt
      ) {
        detection.resolvedAt = new Date();
      }
    }

    if (dto.assignedTo !== undefined) {
      detection.assignedTo = dto.assignedTo;
    }

    if (dto.notes !== undefined) {
      detection.notes = dto.notes;
    }

    if (dto.evidence !== undefined) {
      detection.evidence = { ...detection.evidence, ...dto.evidence };
    }

    const updated = await this.detectionRepository.save(detection);

    // Log status changes
    if (dto.status && dto.status !== previousStatus) {
      this.logger.log(
        `Fraud ring detection ${id} status changed: ${previousStatus} -> ${dto.status}`,
      );

      this.eventEmitter.emit('compliance.fraud_ring_status_changed', {
        detectionId: id,
        previousStatus,
        newStatus: dto.status,
        assignedTo: updated.assignedTo,
        resolvedAt: updated.resolvedAt,
      });
    }

    return updated;
  }

  /**
   * Assign a detection to a compliance officer
   */
  async assignDetection(
    id: string,
    assignedTo: string,
  ): Promise<FraudRingDetectionOrmEntity | null> {
    return this.updateDetection(id, {
      assignedTo,
      status: 'investigating',
    });
  }

  /**
   * Confirm a fraud ring detection
   */
  async confirmDetection(
    id: string,
    notes?: string,
  ): Promise<FraudRingDetectionOrmEntity | null> {
    return this.updateDetection(id, {
      status: 'confirmed',
      notes,
    });
  }

  /**
   * Mark a detection as false positive
   */
  async markAsFalsePositive(
    id: string,
    notes?: string,
  ): Promise<FraudRingDetectionOrmEntity | null> {
    return this.updateDetection(id, {
      status: 'false_positive',
      notes,
    });
  }

  /**
   * Find all detections involving a specific user
   */
  async findDetectionsByUser(
    userId: string,
  ): Promise<FraudRingDetectionOrmEntity[]> {
    return this.findDetections({ userId });
  }

  /**
   * Find all detections involving a specific wallet
   */
  async findDetectionsByWallet(
    walletId: string,
  ): Promise<FraudRingDetectionOrmEntity[]> {
    return this.findDetections({ walletId });
  }

  /**
   * Get detection statistics for dashboard
   */
  async getDetectionStats(): Promise<{
    total: number;
    pending: number;
    investigating: number;
    confirmed: number;
    falsePositive: number;
    avgScore: number;
    byType: Record<FraudRingDetectionType, number>;
  }> {
    const stats = await this.detectionRepository
      .createQueryBuilder('detection')
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE status = 'pending')", 'pending')
      .addSelect(
        "COUNT(*) FILTER (WHERE status = 'investigating')",
        'investigating',
      )
      .addSelect("COUNT(*) FILTER (WHERE status = 'confirmed')", 'confirmed')
      .addSelect(
        "COUNT(*) FILTER (WHERE status = 'false_positive')",
        'falsePositive',
      )
      .addSelect('AVG(detection_score)', 'avgScore')
      .getRawOne();

    const byTypeResult = await this.detectionRepository
      .createQueryBuilder('detection')
      .select('detection.detection_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('detection.detection_type')
      .getRawMany();

    const byType: Record<FraudRingDetectionType, number> = {
      network: 0,
      velocity: 0,
      pattern: 0,
    };

    for (const row of byTypeResult) {
      byType[row.type as FraudRingDetectionType] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(stats.total, 10),
      pending: parseInt(stats.pending, 10),
      investigating: parseInt(stats.investigating, 10),
      confirmed: parseInt(stats.confirmed, 10),
      falsePositive: parseInt(stats.falsePositive, 10),
      avgScore: parseFloat(stats.avgScore) || 0,
      byType,
    };
  }
}
