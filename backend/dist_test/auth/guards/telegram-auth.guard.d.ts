import { CanActivate, ExecutionContext } from '@nestjs/common';
export interface TelegramRequestUser {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
}
export declare class TelegramAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
