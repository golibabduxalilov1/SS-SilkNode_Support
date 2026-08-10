import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { ApiException } from '../../common/exceptions/api.exception';
import { EligibilityRequest } from './user-eligibility.guard';

/**
 * requireRole (bo'lim 6.2). UserEligibilityGuard'dan KEYIN ishlatilishi
 * shart — req.verifiedUser'ga tayanadi. Admin/superadmin qandaydir yo'l
 * bilan tiket yaratish so'rovini yuborsa ham backend rad etadi
 * (bo'lim 7, edge case).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles || allowedRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<EligibilityRequest>();
    if (!allowedRoles.includes(request.verifiedUser.role)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'ROLE_NOT_ALLOWED',
        "Ushbu amal uchun ruxsat yo'q.",
      );
    }
    return true;
  }
}
