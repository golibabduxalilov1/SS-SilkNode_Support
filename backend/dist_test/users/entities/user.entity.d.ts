import { Organization } from '../../organizations/entities/organization.entity';
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    SUPERADMIN = "superadmin"
}
export declare class User {
    id: string;
    telegramId: string | null;
    fullname: string | null;
    username: string | null;
    role: UserRole;
    isStarted: boolean;
    startedAt: Date | null;
    phoneNumber: string | null;
    isPhoneVerified: boolean;
    phoneVerifiedAt: Date | null;
    passwordHash: string | null;
    adminLogin: string | null;
    isActive: boolean;
    organization: Organization | null;
    organizationId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
