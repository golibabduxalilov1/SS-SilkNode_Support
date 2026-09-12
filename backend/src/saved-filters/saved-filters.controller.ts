import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { SavedFiltersService } from './saved-filters.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/** T13 — Murojaatlar jadvalidagi saqlangan filtrlar (shaxsiy, har bir admin o'ziniki). */
@Controller('admin/saved-filters')
@UseGuards(AdminJwtAuthGuard)
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const savedFilters = await this.savedFiltersService.findAllForUser(user.id);
    return { success: true, data: savedFilters };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSavedFilterDto, @CurrentUser() user: User) {
    const savedFilter = await this.savedFiltersService.create(user.id, dto);
    return { success: true, data: savedFilter };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.savedFiltersService.remove(id, user.id);
    return { success: true };
  }
}
