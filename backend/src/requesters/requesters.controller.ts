import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { RequestersService } from './requesters.service';
import { UpdateRequesterDto } from './dto/update-requester.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/** Web Admin Panel — "Murojaatchilar" bo'limi: murojaat qilgan shaxslarning yig'ma ro'yxati. */
@Controller('admin/requesters')
@UseGuards(AdminJwtAuthGuard)
export class RequestersController {
  constructor(private readonly requestersService: RequestersService) {}

  @Get()
  async findAll() {
    const requesters = await this.requestersService.findAll();
    return { success: true, data: requesters };
  }

  /**
   * GET /admin/requesters/search?phone=... yoki ?name=... — T03: murojaatchi qidiruvi
   * (telefon yoki F.I.O. bo'yicha). ':key' bilan to'qnashmasligi uchun undan oldin e'lon
   * qilingan (literal segment ustunlik qiladi).
   */
  @Get('search')
  async search(@Query('phone') phone?: string, @Query('name') name?: string) {
    if (name) {
      const requesters = await this.requestersService.searchByName(name);
      return { success: true, data: requesters };
    }
    const requesters = phone ? await this.requestersService.search(phone) : [];
    return { success: true, data: requesters };
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    const detail = await this.requestersService.findOne(key);
    return { success: true, data: detail };
  }

  /** PATCH /admin/requesters/:key — murojaatchi ism/telefonini tahrirlash, faqat superadmin uchun. */
  @Patch(':key')
  @UseGuards(AdminRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async update(@Param('key') key: string, @Body() dto: UpdateRequesterDto) {
    const requester = await this.requestersService.update(key, dto);
    return { success: true, data: requester };
  }

  /**
   * DELETE /admin/requesters/:key — murojaatchini o'chirish, faqat superadmin uchun.
   * Tickets butunlay o'chirilmaydi — faqat ro'yxatdan yashiriladi (requesters.service.remove()).
   */
  @Delete(':key')
  @UseGuards(AdminRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(200)
  async remove(@Param('key') key: string) {
    await this.requestersService.remove(key);
    return { success: true };
  }
}
