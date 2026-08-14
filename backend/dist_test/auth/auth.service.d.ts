import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    getStatus(telegramId: string): Promise<{
        role: string;
        isStarted: boolean;
        isPhoneVerified: boolean;
        fullname: string | null;
    }>;
    adminLogin(login: string, password: string): Promise<{
        accessToken: string;
        user: Pick<User, 'id' | 'fullname' | 'role'>;
    }>;
}
