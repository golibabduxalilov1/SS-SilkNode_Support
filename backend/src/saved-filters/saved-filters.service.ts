import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedFilter } from './entities/saved-filter.entity';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';

@Injectable()
export class SavedFiltersService {
  constructor(
    @InjectRepository(SavedFilter)
    private readonly savedFiltersRepository: Repository<SavedFilter>,
  ) {}

  findAllForUser(userId: string): Promise<SavedFilter[]> {
    return this.savedFiltersRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  create(userId: string, dto: CreateSavedFilterDto): Promise<SavedFilter> {
    const savedFilter = this.savedFiltersRepository.create({
      userId,
      name: dto.name.trim(),
      filterJson: dto.filterJson,
    });
    return this.savedFiltersRepository.save(savedFilter);
  }

  async remove(id: string, userId: string): Promise<void> {
    const savedFilter = await this.savedFiltersRepository.findOne({ where: { id } });
    if (!savedFilter) throw new NotFoundException('Saqlangan filtr topilmadi.');
    if (savedFilter.userId !== userId) {
      throw new ForbiddenException("Bu filtrni o'chirish huquqingiz yo'q.");
    }
    await this.savedFiltersRepository.remove(savedFilter);
  }
}
