import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ApiException } from '../../common/exceptions/api.exception';
import { validateTelegramInitData } from '../utils/telegram-init-data.util';
import { HttpStatus } from '@nestjs/common';

export interface TelegramRequestUser {
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

/**
 * authMiddleware (bo'lim 4.3): Mini App'dan kelgan `X-Telegram-Init-Data`
 * headerini tekshiradi va req.user'ni to'ldiradi. Muvaffaqiyatsiz bo'lsa
 * 401 Unauthorized qaytaradi — verifyUserEligibility'gacha yetib bormaydi
 * (bo'lim 7, edge case: "initData muddati o'tgan yoki hash noto'g'ri").
 */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const initData = request.header('X-Telegram-Init-Data');
    const botToken = process.env.BOT_TOKEN;

    if (!initData) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Foydalanuvchi aniqlanmadi.',
      );
    }

    const parsed = validateTelegramInitData(initData, botToken || '');
    if (!parsed) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'initData muddati o\'tgan yoki noto\'g\'ri.',
      );
    }

    const user: TelegramRequestUser = {
      telegramId: String(parsed.user.id),
      firstName: parsed.user.first_name,
      lastName: parsed.user.last_name,
      username: parsed.user.username,
    };
    (request as Request & { user: TelegramRequestUser }).user = user;
    return true;
  }
}
