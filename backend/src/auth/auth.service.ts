import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async getStatus(telegramId: string) {
    const user = await this.usersService.findByTelegramId(telegramId);
    return {
      role: user?.role ?? 'user',
      isStarted: user?.isStarted ?? false,
      isPhoneVerified: user?.isPhoneVerified ?? false,
      fullname: user?.fullname ?? null,
    };
  }

  /** POST /admin/auth/login (bo'lim 5.3) — Mini App'dan mustaqil, alohida login. */
  async adminLogin(login: string, password: string): Promise<{ accessToken: string; user: Pick<User, 'id' | 'fullname' | 'role'> }> {
    const user = await this.usersService.findByAdminLogin(login);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      adminLogin: user.adminLogin,
      role: user.role,
    });

    return {
      accessToken,
      user: { id: user.id, fullname: user.fullname, role: user.role },
    };
  }
}
