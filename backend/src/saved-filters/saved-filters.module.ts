import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedFilter } from './entities/saved-filter.entity';
import { SavedFiltersService } from './saved-filters.service';
import { SavedFiltersController } from './saved-filters.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SavedFilter]), AuthModule],
  providers: [SavedFiltersService],
  controllers: [SavedFiltersController],
})
export class SavedFiltersModule {}
