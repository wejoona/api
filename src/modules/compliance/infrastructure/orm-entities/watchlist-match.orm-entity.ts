import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WatchlistEntryOrmEntity } from './watchlist-entry.orm-entity';

export type WatchlistMatchStatus = 'pending' | 'confirmed' | 'false_positive';

export type WatchlistMatchType =
  | 'exact_name'
  | 'fuzzy_name'
  | 'alias'
  | 'identifier'
  | 'date_of_birth'
  | 'nationality';

/**
 * Watchlist Match ORM Entity
 *
 * Records potential matches between users and watchlist entries.
 * Requires compliance officer review to confirm or mark as false positive.
 *
 * Workflow:
 * 1. System detects potential match during KYC or transaction screening
 * 2. Match created with 'pending' status
 * 3. Compliance officer reviews match
 * 4. Officer confirms match or marks as false positive
 * 5. Confirmed matches trigger enhanced due diligence or blocking
 */
@Entity({ name: 'watchlist_matches', schema: 'compliance' })
@Index(['userId', 'watchlistEntryId', 'matchType'], { unique: true })
export class WatchlistMatchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'watchlist_entry_id', type: 'uuid' })
  @Index()
  watchlistEntryId!: string;

  @ManyToOne(() => WatchlistEntryOrmEntity, (entry) => entry.matches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'watchlist_entry_id' })
  watchlistEntry!: WatchlistEntryOrmEntity;

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
    enum: [
      'exact_name',
      'fuzzy_name',
      'alias',
      'identifier',
      'date_of_birth',
      'nationality',
    ],
    enumName: 'watchlist_match_type_enum',
  })
  matchType!: WatchlistMatchType;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'false_positive'],
    enumName: 'watchlist_match_status_enum',
    default: 'pending',
  })
  @Index()
  status!: WatchlistMatchStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
