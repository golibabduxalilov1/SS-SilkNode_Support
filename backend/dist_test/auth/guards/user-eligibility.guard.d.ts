import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { TelegramRequestUser } from './telegram-auth.guard';
import { User } from '../../users/entities/user.entity';
export interface EligibilityRequest extends Request {
    user: TelegramRequestUser;
    verifiedUser: User;
}
export declare class UserEligibilityGuard implements CanActivate {
    private readonly usersService;
    constructor(usersService: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
