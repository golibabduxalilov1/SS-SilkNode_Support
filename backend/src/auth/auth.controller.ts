import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { TelegramAuthGuard, TelegramRequestUser } from './guards/telegram-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { User } from '../users/entities/user.entity';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** GET /api/v1/auth/status — bo'lim 6.1 */
  @Get('auth/status')
  @UseGuards(TelegramAuthGuard)
  async getStatus(@Req() req: Request & { user: TelegramRequestUser }) {
    const data = await this.authService.getStatus(req.user.telegramId);
    return { success: true, data };
  }

  /** POST /api/v1/admin/auth/login — bo'lim 5.3, Mini App'dan mustaqil kirish nuqtasi. */
  @Post('admin/auth/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto) {
    const result = await this.authService.adminLogin(dto.login, dto.password);
    return { success: true, data: result };
  }

  /** GET /api/v1/admin/auth/me — sahifa yangilanganda joriy admin/superadmin ma'lumotini tiklash uchun. */
  @Get('admin/auth/me')
  @UseGuards(AdminJwtAuthGuard)
  async me(@Req() req: Request & { user: User }) {
    const { id, fullname, role } = req.user;
    return { success: true, data: { id, fullname, role } };
  }
}
