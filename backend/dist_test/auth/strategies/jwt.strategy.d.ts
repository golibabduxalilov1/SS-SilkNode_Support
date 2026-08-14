import { Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { User, UserRole } from '../../users/entities/user.entity';
export interface JwtPayload {
    sub: string;
    adminLogin: string;
    role: UserRole;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    constructor(usersService: UsersService);
    validate(payload: JwtPayload): Promise<User>;
}
export {};
