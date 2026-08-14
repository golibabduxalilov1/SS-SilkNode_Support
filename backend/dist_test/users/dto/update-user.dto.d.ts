import { UserRole } from '../entities/user.entity';
export declare class UpdateUserDto {
    fullname?: string;
    adminLogin?: string;
    role?: UserRole.ADMIN | UserRole.SUPERADMIN;
    organizationId?: string;
    isActive?: boolean;
    password?: string;
    telegramId?: string;
}
