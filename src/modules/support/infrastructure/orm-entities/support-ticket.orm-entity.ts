import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';
import { TicketMessageOrmEntity } from './ticket-message.orm-entity';

@Entity({ name: 'support_tickets', schema: 'system' })
export class SupportTicketOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({
    type: 'enum',
    enum: [
      'account',
      'transaction',
      'deposit',
      'withdrawal',
      'kyc',
      'security',
      'technical',
      'billing',
      'other',
    ],
    enumName: 'ticket_category',
    default: 'other',
  })
  category: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'urgent'],
    enumName: 'ticket_priority',
    default: 'medium',
  })
  priority: string;

  @Column({
    type: 'enum',
    enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    enumName: 'ticket_status',
    default: 'open',
  })
  @Index()
  status: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  @Index()
  assignedTo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @OneToMany(() => TicketMessageOrmEntity, (message) => message.ticket)
  messages?: TicketMessageOrmEntity[];
}
