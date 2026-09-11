import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RequestersService } from './requesters.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';

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

  @Get(':key')
  async findOne(@Param('key') key: string) {
    const detail = await this.requestersService.findOne(key);
    return { success: true, data: detail };
  }
}
