import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';

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
}
