import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KycVerificationOrmEntity,
  KycVerificationStatus,
} from '../orm-entities/kyc-verification.orm-entity';

@Injectable()
export class KycVerificationRepository {
  constructor(
    @InjectRepository(KycVerificationOrmEntity)
    private readonly repository: Repository<KycVerificationOrmEntity>,
  ) {}

  async create(userId: string): Promise<KycVerificationOrmEntity> {
    const entity = this.repository.create({
      userId,
      status: 'documents_pending',
    });
    return this.repository.save(entity);
  }

  async findByUserId(userId: string): Promise<KycVerificationOrmEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async findById(id: string): Promise<KycVerificationOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByStatus(status: KycVerificationStatus): Promise<KycVerificationOrmEntity[]> {
    return this.repository.find({ where: { status }, order: { createdAt: 'ASC' } });
  }

  async findPendingManualReview(): Promise<KycVerificationOrmEntity[]> {
    return this.repository.find({
      where: { status: 'manual_review' },
      order: { submittedAt: 'ASC' },
    });
  }

  async save(entity: KycVerificationOrmEntity): Promise<KycVerificationOrmEntity> {
    return this.repository.save(entity);
  }

  async updateStatus(
    id: string,
    status: KycVerificationStatus,
    additionalData?: Partial<KycVerificationOrmEntity>,
  ): Promise<KycVerificationOrmEntity | null> {
    await this.repository.update(id, {
      status,
      ...additionalData,
      updatedAt: new Date(),
    });
    return this.findById(id);
  }

  async countByStatus(): Promise<Record<KycVerificationStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('kyc')
      .select('kyc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('kyc.status')
      .getRawMany();

    const counts: Record<string, number> = {
      none: 0,
      documents_pending: 0,
      pending_verification: 0,
      auto_approved: 0,
      manual_review: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts as Record<KycVerificationStatus, number>;
  }

  /**
   * Upsert KYC record by userId
   */
  async upsert(data: {
    userId: string;
    status?: KycVerificationStatus;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    country?: string;
    idType?: string;
    idNumber?: string;
    idFrontKey?: string;
    idBackKey?: string;
    selfieKey?: string;
    autoVerificationProvider?: string;
    autoVerificationId?: string;
    autoVerificationScore?: number;
    autoVerificationResult?: Record<string, unknown>;
    autoVerifiedAt?: Date;
    manualReviewedBy?: string;
    manualReviewNotes?: string;
    rejectionReason?: string;
    manualReviewedAt?: Date;
    submittedAt?: Date;
    approvedAt?: Date;
    attempts?: number;
  }): Promise<KycVerificationOrmEntity> {
    let entity = await this.findByUserId(data.userId);

    if (!entity) {
      entity = this.repository.create({
        userId: data.userId,
        status: data.status || 'documents_pending',
      });
    }

    // Update fields
    if (data.status !== undefined) entity.status = data.status;
    if (data.firstName !== undefined) entity.firstName = data.firstName;
    if (data.lastName !== undefined) entity.lastName = data.lastName;
    if (data.dateOfBirth !== undefined) entity.dateOfBirth = data.dateOfBirth;
    if (data.country !== undefined) entity.country = data.country;
    if (data.idType !== undefined) entity.idType = data.idType as any;
    if (data.idNumber !== undefined) entity.idNumber = data.idNumber;
    if (data.idFrontKey !== undefined) entity.idFrontKey = data.idFrontKey;
    if (data.idBackKey !== undefined) entity.idBackKey = data.idBackKey;
    if (data.selfieKey !== undefined) entity.selfieKey = data.selfieKey;
    if (data.autoVerificationProvider !== undefined) entity.autoVerificationProvider = data.autoVerificationProvider;
    if (data.autoVerificationId !== undefined) entity.autoVerificationId = data.autoVerificationId;
    if (data.autoVerificationScore !== undefined) entity.autoVerificationScore = data.autoVerificationScore;
    if (data.autoVerificationResult !== undefined) entity.autoVerificationResult = data.autoVerificationResult;
    if (data.autoVerifiedAt !== undefined) entity.autoVerifiedAt = data.autoVerifiedAt;
    if (data.manualReviewedBy !== undefined) entity.manualReviewedBy = data.manualReviewedBy;
    if (data.manualReviewNotes !== undefined) entity.manualReviewNotes = data.manualReviewNotes;
    if (data.rejectionReason !== undefined) entity.rejectionReason = data.rejectionReason;
    if (data.manualReviewedAt !== undefined) entity.manualReviewedAt = data.manualReviewedAt;
    if (data.submittedAt !== undefined) entity.submittedAt = data.submittedAt;
    if (data.approvedAt !== undefined) entity.approvedAt = data.approvedAt;

    return this.repository.save(entity);
  }
}
