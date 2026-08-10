import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from '../users/entities/user.entity';

export interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsClosed: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  avgResolutionMinutes: number | null;
}

export interface DashboardStats {
  statusCounts: {
    new: number;
    in_progress: number;
    waiting_user: number;
    resolved: number;
    closed: number;
  };
  allOpen: number;
  closedToday: number;
  closedThisWeek: number;
  closedThisMonth: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  byAssignee: AssigneeStats[];
  byOrganization: OrganizationStats[];
}

function diffMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // dushanba boshlanadi
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

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
      categoryId: dto.categoryId,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      organizationId: dto.organizationId ?? createdBy.organizationId ?? null,
      createdById: createdBy.id,
    });
    return this.ticketsRepository.save(ticket);
  }

  findMine(userId: string): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      where: { createdById: userId },
      relations: ['organization', 'categoryEntity'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(id: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['organization', 'categoryEntity', 'createdBy', 'assignedTo', 'messages'],
    });
    if (!ticket || ticket.createdById !== userId) {
      throw new NotFoundException('Murojaat topilmadi.');
    }
    return ticket;
  }

  findAllForAdmin(): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      relations: ['organization', 'categoryEntity', 'createdBy', 'assignedTo', 'messages'],
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({
      where: { id },
      relations: ['organization', 'categoryEntity', 'createdBy', 'assignedTo', 'messages'],
    });
  }

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    ticket.status = status;

    // Har safar 'closed'ga o'tganda yangilanadi — murojaat qayta ochilib
    // qayta yopilsa, closed_at/resolution_minutes so'nggi yopilishni aks ettiradi.
    if (status === TicketStatus.CLOSED) {
      const now = new Date();
      ticket.closedAt = now;
      ticket.resolutionMinutes = diffMinutes(ticket.createdAt, now);
    }

    return this.ticketsRepository.save(ticket);
  }

  async assign(id: string, assignedToId: string | null): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    ticket.assignedToId = assignedToId;
    return this.ticketsRepository.save(ticket);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const tickets = await this.ticketsRepository.find({
      relations: ['assignedTo', 'organization'],
    });
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const statusCount = (status: TicketStatus) =>
      tickets.filter((t) => t.status === status).length;

    const closedTickets = tickets.filter((t) => t.status === TicketStatus.CLOSED && t.closedAt);
    const closedToday = closedTickets.filter((t) => t.closedAt! >= todayStart).length;
    const closedThisWeek = closedTickets.filter((t) => t.closedAt! >= weekStart).length;
    const closedThisMonth = closedTickets.filter((t) => t.closedAt! >= monthStart).length;

    const avgFirstResponseMinutes = average(
      tickets.filter((t) => t.firstResponseMinutes != null).map((t) => t.firstResponseMinutes!),
    );
    const avgResolutionMinutes = average(
      closedTickets.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
    );

    const openStatuses = [
      TicketStatus.NEW,
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_USER,
      TicketStatus.RESOLVED,
    ];
    const allOpen = tickets.filter((t) => openStatuses.includes(t.status)).length;

    // "Kim qancha ishladi" — ijrochi bo'yicha guruhlash (GROUP BY assigned_to_id).
    const assigneeGroups = new Map<string, { fullname: string | null; tickets: Ticket[] }>();
    for (const t of tickets) {
      if (!t.assignedToId) continue;
      if (!assigneeGroups.has(t.assignedToId)) {
        assigneeGroups.set(t.assignedToId, {
          fullname: t.assignedTo?.fullname ?? null,
          tickets: [],
        });
      }
      assigneeGroups.get(t.assignedToId)!.tickets.push(t);
    }
    const byAssignee: AssigneeStats[] = Array.from(assigneeGroups.entries())
      .map(([userId, group]) => {
        const closed = group.tickets.filter((t) => t.status === TicketStatus.CLOSED);
        return {
          userId,
          fullname: group.fullname,
          ticketsClosed: closed.length,
          avgFirstResponseMinutes: average(
            group.tickets
              .filter((t) => t.firstResponseMinutes != null)
              .map((t) => t.firstResponseMinutes!),
          ),
          avgResolutionMinutes: average(
            closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
          ),
        };
      })
      .sort((a, b) => b.ticketsClosed - a.ticketsClosed);

    // Tashkilot bo'yicha guruhlash (ixtiyoriy bo'lim).
    const organizationGroups = new Map<string, { name: string; tickets: Ticket[] }>();
    for (const t of tickets) {
      if (!t.organizationId) continue;
      if (!organizationGroups.has(t.organizationId)) {
        organizationGroups.set(t.organizationId, {
          name: t.organization?.name ?? '—',
          tickets: [],
        });
      }
      organizationGroups.get(t.organizationId)!.tickets.push(t);
    }
    const byOrganization: OrganizationStats[] = Array.from(organizationGroups.entries())
      .map(([organizationId, group]) => {
        const closed = group.tickets.filter((t) => t.status === TicketStatus.CLOSED);
        return {
          organizationId,
          organizationName: group.name,
          ticketsCount: group.tickets.length,
          avgResolutionMinutes: average(
            closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
          ),
        };
      })
      .sort((a, b) => b.ticketsCount - a.ticketsCount);

    return {
      statusCounts: {
        new: statusCount(TicketStatus.NEW),
        in_progress: statusCount(TicketStatus.IN_PROGRESS),
        waiting_user: statusCount(TicketStatus.WAITING_USER),
        resolved: statusCount(TicketStatus.RESOLVED),
        closed: statusCount(TicketStatus.CLOSED),
      },
      allOpen,
      closedToday,
      closedThisWeek,
      closedThisMonth,
      avgFirstResponseMinutes,
      avgResolutionMinutes,
      byAssignee,
      byOrganization,
    };
  }
}
