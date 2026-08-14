import { Request } from 'express';
import { AuthService } from './auth.service';
import { TelegramRequestUser } from './guards/telegram-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getStatus(req: Request & {
        user: TelegramRequestUser;
    }): Promise<{
        success: boolean;
        data: {
            role: string;
            isStarted: boolean;
            isPhoneVerified: boolean;
            fullname: string | null;
        };
    }>;
    adminLogin(dto: AdminLoginDto): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            user: Pick<User, "id" | "fullname" | "role">;
        };
    }>;
    me(req: Request & {
        user: User;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            fullname: string | null;
            role: import("../users/entities/user.entity").UserRole;
        };
    }>;
}
