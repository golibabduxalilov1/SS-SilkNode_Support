import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullname?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  adminLogin?: string;

  @IsOptional()
  @IsIn([UserRole.ADMIN, UserRole.SUPERADMIN], {
    message: "role faqat admin yoki superadmin bo'lishi mumkin.",
  })
  role?: UserRole.ADMIN | UserRole.SUPERADMIN;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d*$/, { message: 'Telegram ID faqat raqamlardan iborat bo\'lishi kerak.' })
  telegramId?: string;
}
