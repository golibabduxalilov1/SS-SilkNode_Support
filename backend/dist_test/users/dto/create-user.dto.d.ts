import { UserRole } from '../entities/user.entity';
export declare class CreateUserDto {
    fullname: string;
    adminLogin: string;
    password: string;
    role?: UserRole.ADMIN | UserRole.SUPERADMIN;
    organizationId?: string;
    telegramId?: string;
}
