import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryCluster } from './entities/category.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/entities/audit-log.entity';

function actorDisplayName(actor: User): string {
  return actor.fullname ?? actor.adminLogin ?? actor.id;
}

const DUPLICATE_NAME_MESSAGE = 'Bunday nomli kategoriya allaqachon mavjud.';

/** Postgres unique_violation — `uq_categories_name_lower` indeksi poyga holatida ham dublikatni to'sadi. */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === '23505';
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

  /** Nom bo'yicha qidirish — registr va chetdagi bo'sh joylarga e'tiborsiz (unique indeks bilan bir xil qoida). */
  findByName(name: string): Promise<Category | null> {
    return this.categoriesRepository
      .createQueryBuilder('category')
      .where('lower(btrim(category.name)) = lower(btrim(:name))', { name })
      .getOne();
  }

  /** Bir xil nomli kategoriya bo'lsa, uni qaytaradi (yangi yaratmaydi). Murojaatdagi "boshqa" nom oqimi uchun. */
  async findOrCreate(
    name: string,
    actor?: User,
    extra?: { description?: string | null; colorTag?: string | null; cluster?: CategoryCluster },
  ): Promise<Category> {
    const existing = await this.findByName(name);
    if (existing) return existing;

    try {
      return await this.create(name, actor, extra);
    } catch (err) {
      // Parallel so'rov xuddi shu nomni biroz oldin yaratib qo'ygan bo'lishi mumkin.
      if (err instanceof ConflictException) {
        const created = await this.findByName(name);
        if (created) return created;
      }
      throw err;
    }
  }

  async create(
    name: string,
    actor?: User,
    extra?: { description?: string | null; colorTag?: string | null; cluster?: CategoryCluster },
  ): Promise<Category> {
    name = name.trim();
    if (await this.findByName(name)) throw new ConflictException(DUPLICATE_NAME_MESSAGE);

    let category: Category;
    try {
      category = await this.categoriesRepository.save(
        this.categoriesRepository.create({
          name,
          description: extra?.description ?? null,
          colorTag: extra?.colorTag ?? null,
          cluster: extra?.cluster ?? CategoryCluster.MAHSULOT,
        }),
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(DUPLICATE_NAME_MESSAGE);
      throw err;
    }

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
    data: {
      name?: string;
      isActive?: boolean;
      description?: string | null;
      colorTag?: string | null;
      cluster?: CategoryCluster;
    },
    actor?: User,
  ): Promise<Category> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundException('Kategoriya topilmadi.');

    if (data.name !== undefined) {
      const name = data.name.trim();
      const duplicate = await this.findByName(name);
      if (duplicate && duplicate.id !== category.id) {
        throw new ConflictException(DUPLICATE_NAME_MESSAGE);
      }
      category.name = name;
    }
    if (data.isActive !== undefined) category.isActive = data.isActive;
    if (data.description !== undefined) category.description = data.description;
    if (data.colorTag !== undefined) category.colorTag = data.colorTag;
    if (data.cluster !== undefined) category.cluster = data.cluster;

    let updated: Category;
    try {
      updated = await this.categoriesRepository.save(category);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(DUPLICATE_NAME_MESSAGE);
      throw err;
    }

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
