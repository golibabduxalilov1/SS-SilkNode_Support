import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum, IsHexColor, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryCluster } from './entities/category.entity';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  /** T14 — ixtiyoriy. */
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  colorTag?: string;

  /** T16 — minimal klasterlash. */
  @IsOptional()
  @IsEnum(CategoryCluster)
  cluster?: CategoryCluster;

  /**
   * true bo'lsa, bir xil nomli kategoriya mavjud bo'lganda xato o'rniga o'sha kategoriya qaytariladi
   * (murojaat yaratishdagi "boshqa" nom oqimi uchun). Standart holatda dublikat 409 qaytaradi.
   */
  @IsOptional()
  @IsBoolean()
  reuseExisting?: boolean;
}

/** Web Admin Panel uchun — Mini App bilan hech qanday umumiy endpoint emas (Organizations bilan bir xil pattern). */
@Controller('admin/categories')
@UseGuards(AdminJwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { success: true, data: categories };
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto, @CurrentUser() actor: User) {
    const extra = {
      description: dto.description,
      colorTag: dto.colorTag,
      cluster: dto.cluster,
    };
    const category = dto.reuseExisting
      ? await this.categoriesService.findOrCreate(dto.name, actor, extra)
      : await this.categoriesService.create(dto.name, actor, extra);
    return { success: true, data: category };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() actor: User) {
    const category = await this.categoriesService.update(id, dto, actor);
    return { success: true, data: category };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @CurrentUser() actor: User) {
    await this.categoriesService.remove(id, actor);
    return { success: true };
  }
}

/** Mini App uchun — yangi murojaat yaratishda kategoriya tanlash ro'yxati (faqat faol kategoriyalar). */
@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async findAllActive() {
    const categories = await this.categoriesService.findAllActive();
    return { success: true, data: categories };
  }

  @Post()
  @UseGuards(TelegramAuthGuard, UserEligibilityGuard)
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.findOrCreate(dto.name);
    return { success: true, data: category };
  }
}
