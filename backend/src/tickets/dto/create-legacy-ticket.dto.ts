import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';
import { normalizePhoneOrUndefined } from '../../bot/utils/phone.util';

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

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  requesterName?: string;

  @IsOptional()
  @Transform(({ value }) => normalizePhoneOrUndefined(value))
  @IsPhoneNumber('UZ', { message: "Telefon raqami to'liq emas yoki noto'g'ri formatda." })
  @MaxLength(20)
  requesterPhone?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsISO8601()
  createdAt: string;

  @IsOptional()
  @IsISO8601()
  closedAt?: string;
}
