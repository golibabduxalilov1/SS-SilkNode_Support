import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { UserEligibilityGuard } from '../auth/guards/user-eligibility.guard';

class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
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
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(dto.name);
    return { success: true, data: category };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categoriesService.update(id, dto);
    return { success: true, data: category };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
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
}
