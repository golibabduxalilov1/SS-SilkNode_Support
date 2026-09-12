import { IsEnum, IsOptional } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';
import { MessageVisibility } from '../entities/message.entity';

/** Admin panelda "Mijozga javob" / "Ichki eslatma" tanlovi uchun — T04. */
export class CreateAdminMessageDto extends CreateMessageDto {
  @IsOptional()
  @IsEnum(MessageVisibility)
  visibility?: MessageVisibility;
}
