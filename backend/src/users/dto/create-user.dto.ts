import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsString()
  @IsNotEmpty()
  adminLogin: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsIn([UserRole.ADMIN, UserRole.SUPERADMIN], {
    message: "role faqat admin yoki superadmin bo'lishi mumkin.",
  })
  role?: UserRole.ADMIN | UserRole.SUPERADMIN;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Telegram ID faqat raqamlardan iborat bo\'lishi kerak.' })
  telegramId?: string;
}
