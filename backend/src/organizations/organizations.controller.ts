import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { OrganizationsService } from './organizations.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';

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
}
