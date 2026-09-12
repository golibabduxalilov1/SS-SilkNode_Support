import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';
import { normalizePhoneOrUndefined } from '../../bot/utils/phone.util';

export class CreateTicketDto {
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
}
