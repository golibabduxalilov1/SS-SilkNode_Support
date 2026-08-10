import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/** Tekshiruvdan o'tgan (verifyUserEligibility yoki JWT) foydalanuvchini oladi. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.verifiedUser ?? request.user;
  },
);
