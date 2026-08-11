import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController, PublicCategoriesController } from './categories.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Ticket]), AuthModule, UsersModule],
  providers: [CategoriesService],
  controllers: [CategoriesController, PublicCategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
