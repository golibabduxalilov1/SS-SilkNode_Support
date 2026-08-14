import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(organizationId?: string): Promise<{
        success: boolean;
        data: {
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
            adminLogin: string | null;
            isActive: boolean;
            organization: import("../organizations/entities/organization.entity").Organization | null;
            organizationId: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    create(dto: CreateUserDto): Promise<{
        success: boolean;
        data: {
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
            adminLogin: string | null;
            isActive: boolean;
            organization: import("../organizations/entities/organization.entity").Organization | null;
            organizationId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        success: boolean;
        data: {
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
            adminLogin: string | null;
            isActive: boolean;
            organization: import("../organizations/entities/organization.entity").Organization | null;
            organizationId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    remove(id: string, req: Request & {
        user: User;
    }): Promise<{
        success: boolean;
    }>;
}
