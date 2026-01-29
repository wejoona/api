import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScreeningRecordOrmEntity } from './screening-record.orm-entity';

@Entity({ name: 'screening_matches', schema: 'compliance' })
export class ScreeningMatchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'screening_record_id', type: 'uuid' })
  @Index()
  screeningRecordId!: string;

  @ManyToOne(() => ScreeningRecordOrmEntity, (record) => record.matches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'screening_record_id' })
  screeningRecord!: ScreeningRecordOrmEntity;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId!: string | null;

  @Column({ name: 'match_id', type: 'varchar', length: 255 })
  matchId!: string;

  @Column({ name: 'matched_name', type: 'varchar', length: 500 })
  matchedName!: string;

  @Column({
    name: 'list_type',
    type: 'enum',
    enum: ['sanctions', 'pep', 'adverse_media', 'enforcement'],
  })
  @Index()
  listType!: 'sanctions' | 'pep' | 'adverse_media' | 'enforcement';

  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({
    name: 'match_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  matchScore!: number;

  @Column({
    name: 'match_type',
    type: 'enum',
    enum: ['exact', 'fuzzy', 'alias', 'partial'],
  })
  matchType!: 'exact' | 'fuzzy' | 'alias' | 'partial';

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'false_positive'],
    default: 'pending',
  })
  @Index()
  status!: 'pending' | 'confirmed' | 'false_positive';

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
