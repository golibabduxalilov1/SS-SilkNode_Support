import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController, PublicCategoriesController } from './categories.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule, UsersModule],
  providers: [CategoriesService],
  controllers: [CategoriesController, PublicCategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
