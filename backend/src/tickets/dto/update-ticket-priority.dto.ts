import { IsEnum } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';

export class UpdateTicketPriorityDto {
  @IsEnum(TicketPriority)
  priority: TicketPriority;
}
