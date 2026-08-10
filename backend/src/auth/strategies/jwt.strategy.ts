import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { User, UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  adminLogin: string;
  role: UserRole;
}

/** Web Admin Panel uchun JWT strategiyasi (bo'lim 5.3) — Mini App bilan hech qanday umumiy sessiya yo'q. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findByAdminLogin(payload.adminLogin);
    if (
      !user ||
      !user.isActive ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)
    ) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
