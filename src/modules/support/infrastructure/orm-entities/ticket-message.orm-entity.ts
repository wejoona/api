import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupportTicketOrmEntity } from './support-ticket.orm-entity';

@Entity({ name: 'ticket_messages', schema: 'system' })
export class TicketMessageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  @Index()
  ticketId: string;

  @ManyToOne(() => SupportTicketOrmEntity, (ticket) => ticket.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: SupportTicketOrmEntity;

  @Column({
    name: 'sender_type',
    type: 'enum',
    enum: ['user', 'agent', 'system'],
    enumName: 'message_sender_type',
  })
  senderType: string;

  @Column({ name: 'sender_id', type: 'uuid', nullable: true })
  senderId: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: '[]' })
  attachments: object[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
