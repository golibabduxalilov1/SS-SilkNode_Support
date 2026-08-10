import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserEligibilityGuard } from './guards/user-eligibility.guard';
import { TelegramAuthGuard } from './guards/telegram-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret-change-me',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserEligibilityGuard,
    TelegramAuthGuard,
    RolesGuard,
    AdminJwtAuthGuard,
    AdminRolesGuard,
  ],
  exports: [
    UserEligibilityGuard,
    TelegramAuthGuard,
    RolesGuard,
    AdminJwtAuthGuard,
    AdminRolesGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
