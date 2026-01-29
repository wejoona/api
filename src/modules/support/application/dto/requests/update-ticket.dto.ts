import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
} from '../../../domain/entities/support-ticket.entity';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
