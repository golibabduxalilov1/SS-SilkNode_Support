import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { TelegramRequestUser } from './telegram-auth.guard';
import { User } from '../../users/entities/user.entity';

export interface EligibilityRequest extends Request {
  user: TelegramRequestUser;
  verifiedUser: User;
}

/**
 * verifyUserEligibility (bo'lim 4.3) — TALAB 1 ning yakuniy himoya chizig'i.
 * Faqat is_started && is_phone_verified bo'lgan foydalanuvchi o'tadi.
 * TelegramAuthGuard'dan KEYIN ishlatilishi shart.
 */
@Injectable()
export class UserEligibilityGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EligibilityRequest>();
    const telegramId = request.user?.telegramId;

    if (!telegramId) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Foydalanuvchi aniqlanmadi.',
      );
    }

    const user = await this.usersService.findByTelegramId(telegramId);

    if (!user || !user.isStarted || !user.isPhoneVerified) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'USER_NOT_VERIFIED',
        "Murojaat yuborish uchun avval Telegram botda '/start' bosing va telefon raqamingizni tasdiqlang.",
        {
          isStarted: user?.isStarted ?? false,
          isPhoneVerified: user?.isPhoneVerified ?? false,
        },
      );
    }

    request.verifiedUser = user;
    return true;
  }
}
