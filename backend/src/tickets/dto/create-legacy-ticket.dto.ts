import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';

/** Admin panelda eski (arxiv) murojaatlarni qo'lda, to'liq sana/holat bilan backfill qilish uchun. */
export class CreateLegacyTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  requesterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  requesterPhone?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsISO8601()
  createdAt: string;

  @IsOptional()
  @IsISO8601()
  closedAt?: string;
}
