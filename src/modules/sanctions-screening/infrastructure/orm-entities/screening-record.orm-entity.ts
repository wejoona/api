import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ScreeningMatchOrmEntity } from './screening-match.orm-entity';

@Entity({ name: 'screening_records', schema: 'compliance' })
export class ScreeningRecordOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  @Index()
  entityId: string | null;

  @Column({
    name: 'screening_type',
    type: 'enum',
    enum: ['individual', 'entity'],
  })
  screeningType: 'individual' | 'entity';

  @Column({ type: 'varchar', length: 100 })
  @Index()
  provider: string;

  @Column({ name: 'request_id', type: 'varchar', length: 255 })
  @Index()
  requestId: string;

  @Column({ name: 'screened_name', type: 'varchar', length: 500 })
  screenedName: string;

  @Column({ name: 'match_count', type: 'int', default: 0 })
  matchCount: number;

  @Column({
    name: 'highest_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  highestScore: number;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: ['high', 'medium', 'low', 'none'],
    default: 'none',
  })
  @Index()
  riskLevel: 'high' | 'medium' | 'low' | 'none';

  @Column({ name: 'requires_review', type: 'boolean', default: false })
  @Index()
  requiresReview: boolean;

  @Column({ name: 'auto_blocked', type: 'boolean', default: false })
  @Index()
  autoBlocked: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => ScreeningMatchOrmEntity, (match) => match.screeningRecord)
  matches: ScreeningMatchOrmEntity[];
}
