import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('snapshots')
@Index(['aggregateId', 'aggregateType', 'version'], { unique: true })
@Index(['aggregateId', 'aggregateType'])
export class SnapshotOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  aggregateId: string;

  @Column({ length: 100 })
  aggregateType: string;

  @Column('integer')
  version: number;

  @Column('jsonb')
  state: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
