import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from './entities/user.entity';

function toSafeUser(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

/** Web Admin Panel uchun — Xodimlar (admin/superadmin) boshqaruvi, faqat superadmin uchun. */
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query('organizationId') organizationId?: string) {
    const users = await this.usersService.findAllAdmins(organizationId);
    return { success: true, data: users.map(toSafeUser) };
  }

  @Post()
  @UseGuards(AdminRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.createAdmin(dto);
    return { success: true, data: toSafeUser(user) };
  }

  @Patch(':id')
  @UseGuards(AdminRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.updateAdmin(id, dto);
    return { success: true, data: toSafeUser(user) };
  }

  @Delete(':id')
  @UseGuards(AdminRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(200)
  async remove(@Param('id') id: string, @Req() req: Request & { user: User }) {
    if (req.user.id === id) {
      throw new BadRequestException("O'zingizni o'chira olmaysiz.");
    }
    await this.usersService.remove(id);
    return { success: true };
  }
}
