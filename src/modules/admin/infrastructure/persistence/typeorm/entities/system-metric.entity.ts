import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type MetricType = 'counter' | 'gauge' | 'histogram';

@Entity('system_metrics')
@Index(['metricName'])
@Index(['recordedAt'])
export class SystemMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metric_name', type: 'varchar', length: 100 })
  metricName: string;

  @Column({ name: 'metric_value', type: 'decimal', precision: 18, scale: 6 })
  metricValue: number;

  @Column({
    name: 'metric_type',
    type: 'varchar',
    length: 20,
    default: 'counter',
  })
  metricType: MetricType;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
