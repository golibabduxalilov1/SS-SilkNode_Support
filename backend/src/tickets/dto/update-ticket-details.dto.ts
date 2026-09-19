import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';
import { normalizePhoneOrUndefined } from '../../bot/utils/phone.util';

export class UpdateTicketDetailsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

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
  @Transform(({ value }) => normalizePhoneOrUndefined(value))
  @IsPhoneNumber('UZ', { message: "Telefon raqami to'liq emas yoki noto'g'ri formatda." })
  @MaxLength(20)
  requesterPhone?: string;
}
