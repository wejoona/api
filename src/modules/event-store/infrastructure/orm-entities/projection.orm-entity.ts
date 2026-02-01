import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('projections')
@Index(['name', 'aggregateId'], { unique: true })
@Index(['name'])
@Index(['lastEventVersion'])
export class ProjectionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column('uuid', { nullable: true })
  aggregateId?: string;

  @Column({ length: 100, nullable: true })
  aggregateType?: string;

  @Column('jsonb')
  data: Record<string, any>;

  @Column('uuid')
  lastEventId: string;

  @Column('integer')
  lastEventVersion: number;

  @Column('timestamp')
  lastProcessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
