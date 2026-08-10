import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';

class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

/** Web Admin Panel uchun — Mini App bilan hech qanday umumiy endpoint emas (bo'lim 5.3). */
@Controller('admin/organizations')
@UseGuards(AdminJwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async findAll() {
    const organizations = await this.organizationsService.findAll();
    return { success: true, data: organizations };
  }

  @Post()
  async create(@Body() dto: CreateOrganizationDto) {
    const organization = await this.organizationsService.create(dto.name);
    return { success: true, data: organization };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    const organization = await this.organizationsService.update(id, dto);
    return { success: true, data: organization };
  }
}

/** Mini App uchun — yangi murojaat yaratishda tashkilot tanlash ro'yxati (faqat faol tashkilotlar). */
@Controller('organizations')
export class PublicOrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async findAllActive() {
    const organizations = await this.organizationsService.findAllActive();
    return { success: true, data: organizations };
  }
}
