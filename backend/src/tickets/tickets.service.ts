import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from '../users/entities/user.entity';

export interface ClosedByPriority {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsAssignedTotal: number;
  ticketsOpenNow: number;
  ticketsClosed: number;
  closedByPriority: ClosedByPriority;
  avgResolutionMinutes: number | null;
  slaResolutionBreachCount: number;
  slaComplianceRate: number;
  trendVsPreviousPeriod: {
    ticketsClosedDelta: number;
  };
}

export interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  avgResolutionMinutes: number | null;
}

export interface DailyTrendPoint {
  date: string;
  created: number;
  closed: number;
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
  avgResolutionMinutes: number | null;
  byAssignee: AssigneeStats[];
  byOrganization: OrganizationStats[];
  dailyTrend: DailyTrendPoint[];
  slaThresholds: {
    resolution: number;
  };
}

export interface DashboardStatsFilter {
  organizationId?: string;
  assignedToId?: string;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const TREND_DAYS = 14;

// TimeGauge komponentida (admin-panel) ishlatiladigan goodMax/warnMax'ga mos —
// backend va frontend bir xil SLA chegarasini ishlatadi.
const SLA_RESOLUTION_MINUTES = 1440; // 24 soat

// Tendentsiya solishtiruvi uchun standart davr uzunligi (dateFrom/dateTo berilmasa).
const DEFAULT_TREND_PERIOD_DAYS = 30;

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

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function percentChange(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function matchesOrgCategory(ticket: Ticket, filter: DashboardStatsFilter): boolean {
  if (filter.organizationId && ticket.organizationId !== filter.organizationId) return false;
  if (filter.categoryId && ticket.categoryId !== filter.categoryId) return false;
  return true;
}

function matchesDateRange(ticket: Ticket, dateFrom?: Date, dateTo?: Date): boolean {
  if (dateFrom && ticket.createdAt < dateFrom) return false;
  if (dateTo && ticket.createdAt > dateTo) return false;
  return true;
}

function resolvePeriod(dateFrom: Date | undefined, dateTo: Date | undefined, now: Date): { start: Date; end: Date } {
  if (dateFrom && dateTo) return { start: dateFrom, end: dateTo };
  if (dateFrom && !dateTo) return { start: dateFrom, end: now };
  if (!dateFrom && dateTo) {
    const start = new Date(dateTo);
    start.setDate(start.getDate() - DEFAULT_TREND_PERIOD_DAYS);
    return { start, end: dateTo };
  }
  const end = now;
  const start = new Date(now);
  start.setDate(start.getDate() - DEFAULT_TREND_PERIOD_DAYS);
  return { start, end };
}

function buildDailyTrend(tickets: Ticket[], now: Date, days: number): DailyTrendPoint[] {
  const buckets = new Map<string, DailyTrendPoint>();
  const rangeStart = startOfDay(now);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    buckets.set(key, { date: key, created: 0, closed: 0 });
  }

  for (const t of tickets) {
    const createdBucket = buckets.get(dateKey(t.createdAt));
    if (createdBucket) createdBucket.created += 1;

    if (t.status === TicketStatus.CLOSED && t.closedAt) {
      const closedBucket = buckets.get(dateKey(t.closedAt));
      if (closedBucket) closedBucket.closed += 1;
    }
  }

  return Array.from(buckets.values());
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

    await this.ticketsRepository.save(ticket);

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('Murojaat topilmadi.');
    return updated;
  }

  async assign(id: string, assignedToId: string | null): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    ticket.assignedToId = assignedToId;
    await this.ticketsRepository.save(ticket);

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('Murojaat topilmadi.');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    await this.ticketsRepository.remove(ticket);
  }

  async getDashboardStats(filter: DashboardStatsFilter = {}): Promise<DashboardStats> {
    const tickets = await this.ticketsRepository.find({
      relations: ['assignedTo', 'organization'],
    });
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    // Filtr qatlamlari:
    // - orgCategoryTickets: faqat organizationId/categoryId bo'yicha (sana va ijrochidan mustaqil) —
    //   ticketsOpenNow kabi "real vaqtdagi" ko'rsatkichlar shundan hisoblanadi.
    // - periodTickets: yuqoridagi + sana oralig'i (dateFrom/dateTo) — "hisobot davri".
    // - generalTickets: periodTickets + assignedToId (berilgan bo'lsa) — statusCounts va h.k. uchun.
    // byAssignee esa har doim periodTickets'dan (assignedToId'ga qaramay) quriladi (TZ talabi).
    const orgCategoryTickets = tickets.filter((t) => matchesOrgCategory(t, filter));
    const periodTickets = orgCategoryTickets.filter((t) =>
      matchesDateRange(t, filter.dateFrom, filter.dateTo),
    );
    const generalTickets = filter.assignedToId
      ? periodTickets.filter((t) => t.assignedToId === filter.assignedToId)
      : periodTickets;

    const statusCount = (status: TicketStatus) =>
      generalTickets.filter((t) => t.status === status).length;

    const closedTickets = generalTickets.filter((t) => t.status === TicketStatus.CLOSED && t.closedAt);
    const closedToday = closedTickets.filter((t) => t.closedAt! >= todayStart).length;
    const closedThisWeek = closedTickets.filter((t) => t.closedAt! >= weekStart).length;
    const closedThisMonth = closedTickets.filter((t) => t.closedAt! >= monthStart).length;

    const avgResolutionMinutes = average(
      closedTickets.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
    );

    const openStatuses = [
      TicketStatus.NEW,
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_USER,
      TicketStatus.RESOLVED,
    ];
    const allOpen = generalTickets.filter((t) => openStatuses.includes(t.status)).length;

    // Har bir ijrochining hozirgi ochiq yuklamasi — sana filtridan mustaqil, chunki bu
    // "hozirgi lahzadagi" real yuklama, hisobot davri bilan cheklanmaydi.
    const openNowByAssignee = new Map<string, number>();
    for (const t of orgCategoryTickets) {
      if (!t.assignedToId || !openStatuses.includes(t.status)) continue;
      openNowByAssignee.set(t.assignedToId, (openNowByAssignee.get(t.assignedToId) ?? 0) + 1);
    }

    // Trend solishtiruvi uchun joriy va undan oldingi teng uzunlikdagi davr.
    const period = resolvePeriod(filter.dateFrom, filter.dateTo, now);
    const periodLengthMs = period.end.getTime() - period.start.getTime();
    const previousPeriod = {
      start: new Date(period.start.getTime() - periodLengthMs),
      end: period.start,
    };
    const closedClosedInWindow = (start: Date, end: Date) =>
      orgCategoryTickets.filter(
        (t) => t.status === TicketStatus.CLOSED && t.closedAt && t.closedAt >= start && t.closedAt < end,
      );
    const closedCurrentByAssignee = new Map<string, number>();
    for (const t of closedClosedInWindow(period.start, period.end)) {
      if (!t.assignedToId) continue;
      closedCurrentByAssignee.set(t.assignedToId, (closedCurrentByAssignee.get(t.assignedToId) ?? 0) + 1);
    }
    const closedPreviousByAssignee = new Map<string, number>();
    for (const t of closedClosedInWindow(previousPeriod.start, previousPeriod.end)) {
      if (!t.assignedToId) continue;
      closedPreviousByAssignee.set(t.assignedToId, (closedPreviousByAssignee.get(t.assignedToId) ?? 0) + 1);
    }

    // "Kim qancha ishladi" — ijrochi bo'yicha guruhlash (GROUP BY assigned_to_id), assignedToId
    // filtridan mustaqil — TZ: byAssignee har doim barcha xodimlarni qaytaradi.
    const assigneeGroups = new Map<string, { fullname: string | null; tickets: Ticket[] }>();
    for (const t of periodTickets) {
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
        const closedByPriority: ClosedByPriority = {
          low: closed.filter((t) => t.priority === TicketPriority.LOW).length,
          medium: closed.filter((t) => t.priority === TicketPriority.MEDIUM).length,
          high: closed.filter((t) => t.priority === TicketPriority.HIGH).length,
          critical: closed.filter((t) => t.priority === TicketPriority.CRITICAL).length,
        };
        const slaResolutionBreachCount = closed.filter(
          (t) => t.resolutionMinutes != null && t.resolutionMinutes > SLA_RESOLUTION_MINUTES,
        ).length;
        const slaComplianceRate =
          closed.length > 0
            ? Math.round(((closed.length - slaResolutionBreachCount) / closed.length) * 100)
            : 100;

        return {
          userId,
          fullname: group.fullname,
          ticketsAssignedTotal: group.tickets.length,
          ticketsOpenNow: openNowByAssignee.get(userId) ?? 0,
          ticketsClosed: closed.length,
          closedByPriority,
          avgResolutionMinutes: average(
            closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
          ),
          slaResolutionBreachCount,
          slaComplianceRate,
          trendVsPreviousPeriod: {
            ticketsClosedDelta: percentChange(
              closedCurrentByAssignee.get(userId) ?? 0,
              closedPreviousByAssignee.get(userId) ?? 0,
            ),
          },
        };
      })
      .sort((a, b) => (a.fullname ?? '').localeCompare(b.fullname ?? ''));

    // Tashkilot bo'yicha guruhlash (ixtiyoriy bo'lim).
    const organizationGroups = new Map<string, { name: string; tickets: Ticket[] }>();
    for (const t of generalTickets) {
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
      avgResolutionMinutes,
      byAssignee,
      byOrganization,
      dailyTrend: buildDailyTrend(generalTickets, now, TREND_DAYS),
      slaThresholds: {
        resolution: SLA_RESOLUTION_MINUTES,
      },
    };
  }
}
