import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  findAllActive(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  create(name: string): Promise<Category> {
    return this.categoriesRepository.save(this.categoriesRepository.create({ name }));
  }

  async update(
    id: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<Category> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundException('Kategoriya topilmadi.');

    if (data.name !== undefined) category.name = data.name;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    return this.categoriesRepository.save(category);
  }
}
