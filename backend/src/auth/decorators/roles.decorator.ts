import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** requireRole(...allowedRoles) — bo'lim 6.2. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
