import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

  create(name: string): Promise<Organization> {
    return this.organizationsRepository.save(this.organizationsRepository.create({ name }));
  }

  async update(
    id: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<Organization> {
    const organization = await this.findById(id);
    if (!organization) throw new NotFoundException('Tashkilot topilmadi.');

    if (data.name !== undefined) organization.name = data.name;
    if (data.isActive !== undefined) organization.isActive = data.isActive;

    return this.organizationsRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
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
  }
}
