import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/entities/audit-log.entity';

function actorDisplayName(actor: User): string {
  return actor.fullname ?? actor.adminLogin ?? actor.id;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly auditLogService: AuditLogService,
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

  async create(name: string, actor?: User): Promise<Category> {
    const category = await this.categoriesRepository.save(this.categoriesRepository.create({ name }));

    if (actor) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.CATEGORY_CREATED,
        'category',
        category.id,
        { name: category.name },
      );
    }

    return category;
  }

  async update(
    id: string,
    data: { name?: string; isActive?: boolean },
    actor?: User,
  ): Promise<Category> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundException('Kategoriya topilmadi.');

    if (data.name !== undefined) category.name = data.name;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    const updated = await this.categoriesRepository.save(category);

    if (actor) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.CATEGORY_UPDATED,
        'category',
        updated.id,
        { name: updated.name, isActive: updated.isActive },
      );
    }

    return updated;
  }

  async remove(id: string, actor?: User): Promise<void> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundException('Kategoriya topilmadi.');

    const ticketCount = await this.ticketsRepository.count({ where: { categoryId: id } });
    if (ticketCount > 0) {
      throw new ConflictException(
        "Bu kategoriyaga bog'liq murojaatlar mavjud, uni o'chirib bo'lmaydi.",
      );
    }

    await this.categoriesRepository.remove(category);

    if (actor) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.CATEGORY_DELETED,
        'category',
        id,
        { name: category.name },
      );
    }
  }
}
