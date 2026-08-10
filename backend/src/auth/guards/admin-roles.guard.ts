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
import { User } from '../../users/entities/user.entity';

/** requireRole ning Web Admin Panel (JWT) endpointlari uchun varianti — masalan superadmin-only amallar. */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: User }>();
    if (!allowedRoles.includes(request.user.role)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'ROLE_NOT_ALLOWED',
        "Ushbu amal uchun ruxsat yo'q.",
      );
    }
    return true;
  }
}
