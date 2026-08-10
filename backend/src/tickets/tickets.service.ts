import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  private generateTicketNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TCK-${datePart}-${randomPart}`;
  }

  async create(dto: CreateTicketDto, createdBy: User): Promise<Ticket> {
    const ticket = this.ticketsRepository.create({
      number: this.generateTicketNumber(),
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      organizationId: dto.organizationId ?? createdBy.organizationId ?? null,
      createdById: createdBy.id,
    });
    return this.ticketsRepository.save(ticket);
  }

  findMine(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { createdById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  findAllForAdmin(): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      relations: ['organization', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({
      where: { id },
      relations: ['organization', 'createdBy', 'assignedTo', 'messages'],
    });
  }
}
