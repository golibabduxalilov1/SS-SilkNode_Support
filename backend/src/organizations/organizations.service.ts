import { Injectable } from '@nestjs/common';
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

  findById(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { id } });
  }

  create(name: string): Promise<Organization> {
    return this.organizationsRepository.save(this.organizationsRepository.create({ name }));
  }
}
