import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/entities/audit-log.entity';

function actorDisplayName(actor: User): string {
  return actor.fullname ?? actor.adminLogin ?? actor.id;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({ order: { name: 'ASC' } });
  }

  findAllActive(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findById(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { id } });
  }

  /** Nomlar bo'yicha katta-kichik harf va bo'sh joylarni e'tiborga olmasdan tekshiradi. */
  private async findDuplicateByName(
    manager: EntityManager,
    name: string,
    excludeId?: string,
  ): Promise<Organization | null> {
    const qb = manager
      .createQueryBuilder(Organization, 'organization')
      .where('LOWER(organization.name) = LOWER(:name)', { name });
    if (excludeId) {
      qb.andWhere('organization.id != :excludeId', { excludeId });
    }
    return qb.getOne();
  }

  /**
   * Bir xil nomli tashkilot bir vaqtning o'zida ikki marta yaratilishining (masalan,
   * formani ikki marta yuborish orqali) oldini olish uchun shu nom bo'yicha Postgres
   * advisory lock olinadi — parallel so'rovlar navbat bilan, bittalab tekshiriladi.
   */
  private async assertNameAvailable(manager: EntityManager, name: string, excludeId?: string): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext(LOWER($1))::bigint)', [name]);
    const duplicate = await this.findDuplicateByName(manager, name, excludeId);
    if (duplicate) {
      throw new ConflictException("Bu nomdagi tashkilot allaqachon mavjud.");
    }
  }

  async create(
    name: string,
    actor?: User,
    extra?: { description?: string | null; colorTag?: string | null },
  ): Promise<Organization> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new BadRequestException("Tashkilot nomi bo'sh bo'lishi mumkin emas.");
    }

    const organization = await this.organizationsRepository.manager.transaction(async (manager) => {
      await this.assertNameAvailable(manager, trimmedName);
      return manager.save(
        Organization,
        manager.create(Organization, {
          name: trimmedName,
          description: extra?.description ?? null,
          colorTag: extra?.colorTag ?? null,
        }),
      );
    });

    if (actor) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.ORGANIZATION_CREATED,
        'organization',
        organization.id,
        { name: organization.name },
      );
    }

    return organization;
  }

  async update(
    id: string,
    data: { name?: string; isActive?: boolean; description?: string | null; colorTag?: string | null },
    actor?: User,
  ): Promise<Organization> {
    const trimmedName = data.name !== undefined ? data.name.trim() : undefined;
    if (trimmedName !== undefined && !trimmedName) {
      throw new BadRequestException("Tashkilot nomi bo'sh bo'lishi mumkin emas.");
    }

    const updated = await this.organizationsRepository.manager.transaction(async (manager) => {
      const organization = await manager.findOne(Organization, { where: { id } });
      if (!organization) throw new NotFoundException('Tashkilot topilmadi.');

      if (trimmedName !== undefined) {
        await this.assertNameAvailable(manager, trimmedName, id);
        organization.name = trimmedName;
      }
      if (data.isActive !== undefined) organization.isActive = data.isActive;
      if (data.description !== undefined) organization.description = data.description;
      if (data.colorTag !== undefined) organization.colorTag = data.colorTag;

      return manager.save(Organization, organization);
    });

    if (actor) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.ORGANIZATION_UPDATED,
        'organization',
        updated.id,
        { name: updated.name, isActive: updated.isActive },
      );
    }

    return updated;
  }

  async remove(id: string, actor?: User): Promise<void> {
    const organization = await this.findById(id);
    if (!organization) throw new NotFoundException('Tashkilot topilmadi.');

    const [ticketCount, userCount] = await Promise.all([
      this.ticketsRepository.count({ where: { organizationId: id } }),
      this.usersRepository.count({ where: { organizationId: id } }),
    ]);
    if (ticketCount > 0 || userCount > 0) {
      throw new ConflictException(
        "Bu tashkilotga bog'liq murojaatlar yoki xodimlar mavjud, uni o'chirib bo'lmaydi.",
      );
    }

    await this.organizationsRepository.remove(organization);

    if (actor) {
      await this.auditLogService.log(
        actor.id,
        actorDisplayName(actor),
        AuditAction.ORGANIZATION_DELETED,
        'organization',
        id,
        { name: organization.name },
      );
    }
  }
}
