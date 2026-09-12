import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

/** T09 — murojaatlar jadvalida bir nechta tiketni bitta amal bilan o'zgartirish. */
export class BulkUpdateTicketsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
