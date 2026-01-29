import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Fraud Ring Detection Type
 */
export type FraudRingDetectionType = 'network' | 'velocity' | 'pattern';

/**
 * Fraud Ring Detection Status
 */
export type FraudRingDetectionStatus =
  | 'pending'
  | 'investigating'
  | 'confirmed'
  | 'false_positive';

/**
 * Fraud Ring Detection Indicators
 */
export interface FraudRingIndicators {
  device_fingerprints?: string[];
  ip_addresses?: string[];
  phone_numbers?: string[];
  transaction_patterns?: string[];
  shared_beneficiaries?: string[];
  timing_correlations?: string[];
  amount_patterns?: string[];
  geographic_clusters?: string[];
  [key: string]: unknown;
}

/**
 * Fraud Ring Evidence
 */
export interface FraudRingEvidence {
  transactions?: Array<{
    id: string;
    amount: number;
    timestamp: string;
    user_id: string;
  }>;
  device_links?: Array<{
    device_id: string;
    user_ids: string[];
  }>;
  communication_patterns?: Array<{
    type: string;
    data: unknown;
  }>;
  network_graph?: {
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ source: string; target: string; weight: number }>;
  };
  [key: string]: unknown;
}

/**
 * Fraud Ring Detection Entity
 *
 * Tracks suspected fraud ring activities involving multiple users/wallets.
 * Used for coordinated fraud detection across:
 * - Network analysis (shared devices, IPs, beneficiaries)
 * - Velocity patterns (coordinated timing, amounts)
 * - Behavioral patterns (similar transaction patterns)
 *
 * BCEAO/WAEMU Compliance:
 * - Supports AML/CFT requirements for organized fraud detection
 * - Maintains audit trail for regulatory reporting
 * - 7-year retention per BCEAO mandate
 */
@Entity({ name: 'fraud_ring_detections', schema: 'compliance' })
export class FraudRingDetectionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'detection_type',
    type: 'enum',
    enum: ['network', 'velocity', 'pattern'],
  })
  @Index()
  detectionType: FraudRingDetectionType;

  @Column({ name: 'linked_user_ids', type: 'uuid', array: true, default: '{}' })
  linkedUserIds: string[];

  @Column({
    name: 'linked_wallet_ids',
    type: 'uuid',
    array: true,
    default: '{}',
  })
  linkedWalletIds: string[];

  @Column({
    name: 'detection_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  detectionScore: number; // 0-100

  @Column({ name: 'indicators', type: 'jsonb', default: '{}' })
  indicators: FraudRingIndicators;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'investigating', 'confirmed', 'false_positive'],
    default: 'pending',
  })
  @Index()
  status: FraudRingDetectionStatus;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  @Index()
  assignedTo: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'evidence', type: 'jsonb', default: '{}' })
  evidence: FraudRingEvidence;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
