import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
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

  async remove(id: string): Promise<void> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundException('Kategoriya topilmadi.');

    const ticketCount = await this.ticketsRepository.count({ where: { categoryId: id } });
    if (ticketCount > 0) {
      throw new ConflictException(
        "Bu kategoriyaga bog'liq murojaatlar mavjud, uni o'chirib bo'lmaydi.",
      );
    }

    await this.categoriesRepository.remove(category);
  }
}
