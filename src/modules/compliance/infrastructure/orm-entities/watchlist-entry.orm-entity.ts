import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { WatchlistMatchOrmEntity } from './watchlist-match.orm-entity';

export type WatchlistListType = 'sanctions' | 'pep' | 'adverse_media';

/**
 * Watchlist Entry ORM Entity
 *
 * Stores sanctions, PEP, and adverse media entries for screening.
 * Data typically sourced from:
 * - OFAC SDN List (US Treasury)
 * - UN Security Council Consolidated List
 * - EU Consolidated List
 * - World-Check (Refinitiv)
 * - Dow Jones Risk & Compliance
 * - ComplyAdvantage
 * - BCEAO regional lists
 */
@Entity({ name: 'watchlist_entries', schema: 'compliance' })
export class WatchlistEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'list_type',
    type: 'enum',
    enum: ['sanctions', 'pep', 'adverse_media'],
    enumName: 'watchlist_list_type_enum',
  })
  @Index()
  listType!: WatchlistListType;

  @Column({ type: 'varchar', length: 500 })
  name!: string;

  @Column({ type: 'jsonb', default: [] })
  aliases!: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  identifiers!: Record<string, string[]>;

  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({ name: 'source_url', type: 'varchar', length: 1000, nullable: true })
  sourceUrl!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => WatchlistMatchOrmEntity, (match) => match.watchlistEntry)
  matches!: WatchlistMatchOrmEntity[];
}
