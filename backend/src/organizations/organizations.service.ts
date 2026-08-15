import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(name: string, actor?: User): Promise<Organization> {
    const organization = await this.organizationsRepository.save(
      this.organizationsRepository.create({ name }),
    );

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
    data: { name?: string; isActive?: boolean },
    actor?: User,
  ): Promise<Organization> {
    const organization = await this.findById(id);
    if (!organization) throw new NotFoundException('Tashkilot topilmadi.');

    if (data.name !== undefined) organization.name = data.name;
    if (data.isActive !== undefined) organization.isActive = data.isActive;

    const updated = await this.organizationsRepository.save(organization);

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
