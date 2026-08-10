import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
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
}
