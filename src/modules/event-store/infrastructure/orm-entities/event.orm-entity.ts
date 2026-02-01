import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('events')
@Index(['aggregateId', 'aggregateType', 'version'], { unique: true })
@Index(['aggregateId', 'aggregateType'])
@Index(['eventType'])
@Index(['correlationId'])
@Index(['timestamp'])
export class EventOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  aggregateId: string;

  @Column({ length: 100 })
  aggregateType: string;

  @Column({ length: 100 })
  eventType: string;

  @Column('jsonb')
  eventData: Record<string, any>;

  @Column('jsonb')
  metadata: Record<string, any>;

  @Column('integer')
  version: number;

  @CreateDateColumn()
  timestamp: Date;

  @Column('uuid', { nullable: true })
  userId?: string;

  @Column('uuid', { nullable: true })
  correlationId?: string;

  @Column('uuid', { nullable: true })
  causationId?: string;
}
