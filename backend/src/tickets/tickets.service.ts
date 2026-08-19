import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateLegacyTicketDto } from './dto/create-legacy-ticket.dto';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/entities/audit-log.entity';

export interface ClosedByPriority {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

/** Ijrochining joriy davrdagi tayinlangan tiketlari holat bo'yicha uch guruhga yig'ilgan — stacked bar uchun. */
export interface AssigneeStatusBreakdown {
  /** Yangi + javob kutilmoqda — hali faol ishlanmayotgan, lekin biriktirilgan. */
  pending: number;
  inProgress: number;
  /** Yechilgan + yopilgan. */
  resolved: number;
}

export interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsAssignedTotal: number;
  ticketsOpenNow: number;
  ticketsClosed: number;
  closedByPriority: ClosedByPriority;
  statusBreakdown: AssigneeStatusBreakdown;
  avgResolutionMinutes: number | null;
  slaResolutionBreachCount: number;
  slaComplianceRate: number;
  /** Foydali ish koeffitsienti (%) — calculateProductivityScore() natijasi. */
  productivityScore: number;
  /** Tayinlangan tiketlardan necha foizi yopilgan — productivityScore bilan bir xil formula. */
  closeRate: number;
  /** Shu davrda ushbu ijrochiga tayinlangan tiketlardan nechtasi qayta ochilgan. */
  reopenedCount: number;
  /** reopenedCount / ticketsAssignedTotal, foizda. */
  reopenedRate: number;
  trendVsPreviousPeriod: {
    ticketsClosedDelta: number;
  };
}

export interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  closedCount: number;
  openCount: number;
  avgResolutionMinutes: number | null;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  ticketsCount: number;
  closedCount: number;
  openCount: number;
}

export interface DailyTrendPoint {
  date: string;
  created: number;
  closed: number;
  /** Kumulyativ farq (created - closed), oyna ichidagi birinchi kundan boshlab — backlog dinamikasi. */
  open: number;
}

export interface AssigneeResolutionTrendEntry {
  userId: string;
  fullname: string | null;
  closedCount: number;
}

export interface AssigneeResolutionTrendPoint {
  date: string;
  byAssignee: AssigneeResolutionTrendEntry[];
}

export interface ResolutionFlowPoint {
  date: string;
  opened: number;
  resolved: number;
}

export interface WorkloadHeatmapEntry {
  userId: string;
  fullname: string | null;
  count: number;
}

export interface WorkloadHeatmapPoint {
  date: string;
  byAssignee: WorkloadHeatmapEntry[];
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
  /** byAssignee[].productivityScore'lar o'rtachasi — barcha ijrochilar bo'yicha umumiy KPI. */
  avgProductivityScore: number | null;
  byAssignee: AssigneeStats[];
  byOrganization: OrganizationStats[];
  byCategory: CategoryStats[];
  dailyTrend: DailyTrendPoint[];
  assigneeResolutionTrend: AssigneeResolutionTrendPoint[];
  /** "Murojaatlarni ochilishi va hal qilinishi" grafigi — fiksirlangan TREND_DAYS kunlik oyna. */
  resolutionFlow: ResolutionFlowPoint[];
  /** Yuklama xaritasi — kun bo'yicha, har ijrochiga shu kuni tayinlanib yaratilgan tiketlar soni. */
  workloadHeatmap: WorkloadHeatmapPoint[];
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

// TimeGauge komponentida (admin-panel) ishlatiladigan goodMax/warnMax'ga mos —
// backend va frontend bir xil SLA chegarasini ishlatadi.
const SLA_RESOLUTION_MINUTES = 1440; // 24 soat

// Tendentsiya solishtiruvi uchun standart davr uzunligi (dateFrom/dateTo berilmasa).
const DEFAULT_TREND_PERIOD_DAYS = 30;

// Trend grafiklari filtrga mos davrni ishlatadi (resolvePeriod), lekin admin juda uzoq
// dateFrom tanlasa kunlik bucket soni cheksiz o'smasligi uchun yuqori chegara.
const MAX_TREND_DAYS = 180;

// "Murojaatlarni ochilishi va hal qilinishi" grafigi uchun fiksirlangan oyna uzunligi —
// dailyTrend'dan farqli, dateFrom/dateTo oralig'i qanchalik keng bo'lishidan qat'iy nazar
// har doim so'nggi TREND_DAYS kun (yoki dateTo berilsa, o'sha sanagacha).
const TREND_DAYS = 14;

const MIN_RESOLUTION_MINUTES = 5;

function diffMinutes(from: Date, to: Date): number {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  return Math.max(minutes, MIN_RESOLUTION_MINUTES);
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

/**
 * Foydali ish koeffitsienti — shu davrda ijrochiga tayinlangan tiketlardan nechta foizi
 * yopilgan. Formula keyinchalik ishbilarmonlik talabiga qarab o'zgarishi mumkin
 * (masalan SLA muvofiqligi bilan birlashtirilgan ko'rsatkichga almashtirilishi).
 */
function calculateProductivityScore(closedCount: number, assignedTotal: number): number {
  if (assignedTotal === 0) return 0;
  return Math.round((closedCount / assignedTotal) * 100);
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

function daysBetweenInclusive(start: Date, end: Date): number {
  const days = Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1;
  return Math.min(MAX_TREND_DAYS, Math.max(1, days));
}

function buildDailyTrend(tickets: Ticket[], start: Date, days: number): DailyTrendPoint[] {
  const buckets = new Map<string, DailyTrendPoint>();
  const rangeStart = startOfDay(start);

  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    buckets.set(key, { date: key, created: 0, closed: 0, open: 0 });
  }

  for (const t of tickets) {
    const createdBucket = buckets.get(dateKey(t.createdAt));
    if (createdBucket) createdBucket.created += 1;

    if (t.status === TicketStatus.CLOSED && t.closedAt) {
      const closedBucket = buckets.get(dateKey(t.closedAt));
      if (closedBucket) closedBucket.closed += 1;
    }
  }

  // "open" — oyna ichidagi birinchi kundan boshlab kumulyativ (created - closed) farq,
  // ya'ni shu davrda backlog qanday o'sgani/kamaygani (mutlaq ochiq son emas).
  let running = 0;
  for (const bucket of buckets.values()) {
    running += bucket.created - bucket.closed;
    bucket.open = running;
  }

  return Array.from(buckets.values());
}

function buildResolutionFlow(tickets: Ticket[], start: Date, days: number): ResolutionFlowPoint[] {
  const buckets = new Map<string, ResolutionFlowPoint>();
  const rangeStart = startOfDay(start);

  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    buckets.set(key, { date: key, opened: 0, resolved: 0 });
  }

  for (const t of tickets) {
    const openedBucket = buckets.get(dateKey(t.createdAt));
    if (openedBucket) openedBucket.opened += 1;

    if (t.status === TicketStatus.CLOSED && t.closedAt) {
      const resolvedBucket = buckets.get(dateKey(t.closedAt));
      if (resolvedBucket) resolvedBucket.resolved += 1;
    } else if (t.status === TicketStatus.RESOLVED) {
      // RESOLVED holatiga o'tish vaqti alohida ustunda saqlanmaydi — shu holatdagi
      // tiketlar uchun updatedAt (oxirgi o'zgarish vaqti) yaqinlashtirish sifatida ishlatiladi.
      const resolvedBucket = buckets.get(dateKey(t.updatedAt));
      if (resolvedBucket) resolvedBucket.resolved += 1;
    }
  }

  return Array.from(buckets.values());
}

function buildAssigneeResolutionTrend(
  tickets: Ticket[],
  assigneeGroups: Map<string, { fullname: string | null; tickets: Ticket[] }>,
  start: Date,
  days: number,
): AssigneeResolutionTrendPoint[] {
  const rangeStart = startOfDay(start);
  const buckets = new Map<string, Map<string, number>>();
  const bucketOrder: string[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    buckets.set(key, new Map());
    bucketOrder.push(key);
  }

  for (const t of tickets) {
    if (!t.assignedToId || t.status !== TicketStatus.CLOSED || !t.closedAt) continue;
    const bucket = buckets.get(dateKey(t.closedAt));
    if (!bucket) continue;
    bucket.set(t.assignedToId, (bucket.get(t.assignedToId) ?? 0) + 1);
  }

  return bucketOrder.map((date) => {
    const bucket = buckets.get(date)!;
    const byAssignee: AssigneeResolutionTrendEntry[] = Array.from(bucket.entries()).map(
      ([userId, closedCount]) => ({
        userId,
        fullname: assigneeGroups.get(userId)?.fullname ?? null,
        closedCount,
      }),
    );
    return { date, byAssignee };
  });
}

function buildWorkloadHeatmap(
  tickets: Ticket[],
  assigneeGroups: Map<string, { fullname: string | null; tickets: Ticket[] }>,
  start: Date,
  days: number,
): WorkloadHeatmapPoint[] {
  const rangeStart = startOfDay(start);
  const buckets = new Map<string, Map<string, number>>();
  const bucketOrder: string[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    buckets.set(key, new Map());
    bucketOrder.push(key);
  }

  // "Ish miqdori" — shu kuni yaratilib, joriy holatda ushbu ijrochiga tayinlangan tiketlar soni.
  for (const t of tickets) {
    if (!t.assignedToId) continue;
    const bucket = buckets.get(dateKey(t.createdAt));
    if (!bucket) continue;
    bucket.set(t.assignedToId, (bucket.get(t.assignedToId) ?? 0) + 1);
  }

  return bucketOrder.map((date) => {
    const bucket = buckets.get(date)!;
    const byAssignee: WorkloadHeatmapEntry[] = Array.from(bucket.entries()).map(([userId, count]) => ({
      userId,
      fullname: assigneeGroups.get(userId)?.fullname ?? null,
      count,
    }));
    return { date, byAssignee };
  });
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly auditLogService: AuditLogService,
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
      requesterName: dto.requesterName ?? null,
      requesterPhone: dto.requesterPhone ?? null,
    });
    return this.ticketsRepository.save(ticket);
  }

  /**
   * Eski (arxiv) murojaatlarni admin panelda qo'lda backfill qilish uchun — createdAt/closedAt/status
   * adminning o'zi kiritadi. @CreateDateColumn/@UpdateDateColumn faqat .save() orqali yozilganda
   * avtomatik joriy vaqtga almashtiriladi, shu sababli avval oddiy save() bilan yaratilib, so'ng
   * repository.update() bilan (listener/decoratorlarni chetlab o'tib) sanalar to'g'ridan-to'g'ri yoziladi.
   */
  async createLegacy(dto: CreateLegacyTicketDto, createdBy: User): Promise<Ticket> {
    const createdAt = new Date(dto.createdAt);
    const closedAt = dto.closedAt ? new Date(dto.closedAt) : null;
    const now = new Date();

    if (createdAt.getTime() > now.getTime()) {
      throw new BadRequestException("Yaratilgan sana kelajakka tegishli bo'lishi mumkin emas.");
    }
    if (closedAt) {
      if (closedAt.getTime() > now.getTime()) {
        throw new BadRequestException("Yopilgan sana kelajakka tegishli bo'lishi mumkin emas.");
      }
      if (closedAt.getTime() < createdAt.getTime()) {
        throw new BadRequestException("Yopilgan sana yaratilgan sanadan oldin bo'lishi mumkin emas.");
      }
    }

    const status = dto.status ?? (closedAt ? TicketStatus.CLOSED : TicketStatus.NEW);

    const ticket = this.ticketsRepository.create({
      number: this.generateTicketNumber(),
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      organizationId: dto.organizationId ?? createdBy.organizationId ?? null,
      createdById: createdBy.id,
      requesterName: dto.requesterName ?? null,
      requesterPhone: dto.requesterPhone ?? null,
      status,
      closedAt,
      resolutionMinutes: closedAt ? diffMinutes(createdAt, closedAt) : null,
    });
    const saved = await this.ticketsRepository.save(ticket);

    // .save() @CreateDateColumn/@UpdateDateColumn'ni joriy vaqtga majburan o'rnatadi — shu sababli
    // adminning kiritgan sanalarini xom UPDATE so'rovi bilan qayta yozamiz.
    await this.ticketsRepository.update(saved.id, {
      createdAt,
      updatedAt: closedAt ?? createdAt,
    });

    const result = await this.findById(saved.id);
    if (!result) throw new NotFoundException('Murojaat topilmadi.');
    return result;
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

  async updateStatus(id: string, status: TicketStatus, actor: User): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    const previousStatus = ticket.status;
    const wasSettled = ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED;
    const reopening = wasSettled && (status === TicketStatus.NEW || status === TicketStatus.IN_PROGRESS || status === TicketStatus.WAITING_USER);
    if (reopening) {
      ticket.reopenedCount += 1;
    }

    ticket.status = status;

    // Har safar 'closed' yoki 'resolved'ga o'tganda yangilanadi — murojaat qayta ochilib
    // qayta yakunlansa, closed_at/resolution_minutes so'nggi yakunlanishni aks ettiradi.
    if (status === TicketStatus.CLOSED || status === TicketStatus.RESOLVED) {
      const now = new Date();
      ticket.closedAt = now;
      ticket.resolutionMinutes = diffMinutes(ticket.createdAt, now);
    } else if (reopening) {
      ticket.closedAt = null;
      ticket.resolutionMinutes = null;
    }

    await this.ticketsRepository.save(ticket);

    await this.auditLogService.log(
      actor.id,
      actor.fullname ?? actor.adminLogin ?? actor.id,
      AuditAction.TICKET_STATUS_CHANGED,
      'ticket',
      id,
      { from: previousStatus, to: status },
    );

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('Murojaat topilmadi.');
    return updated;
  }

  /**
   * Foydalanuvchi ("Yechildi" / "Hal bo'lmadi" tugmalari) uchun cheklangan status o'tishi.
   * Faqat o'z murojaatiga taalluqli, faqat waiting_user/resolved holatida chaqirilishi mumkin —
   * admin PATCH /admin/tickets/:id/status'dan farqli, ixtiyoriy statusga o'ta olmaydi.
   */
  async updateStatusByUser(id: string, action: 'resolve' | 'reopen', user: User): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');
    if (ticket.createdById !== user.id) {
      throw new NotFoundException('Murojaat topilmadi.');
    }

    if (ticket.status !== TicketStatus.WAITING_USER && ticket.status !== TicketStatus.RESOLVED) {
      throw new BadRequestException("Murojaat holati bu amal uchun mos emas.");
    }

    const previousStatus = ticket.status;
    const nextStatus =
      action === 'resolve'
        ? ticket.status === TicketStatus.RESOLVED
          ? TicketStatus.CLOSED
          : TicketStatus.RESOLVED
        : TicketStatus.IN_PROGRESS;

    if (action === 'reopen' && previousStatus === TicketStatus.RESOLVED) {
      ticket.reopenedCount += 1;
    }

    ticket.status = nextStatus;

    if (nextStatus === TicketStatus.CLOSED || nextStatus === TicketStatus.RESOLVED) {
      const now = new Date();
      ticket.closedAt = now;
      ticket.resolutionMinutes = diffMinutes(ticket.createdAt, now);
    } else {
      ticket.closedAt = null;
      ticket.resolutionMinutes = null;
    }

    await this.ticketsRepository.save(ticket);

    await this.auditLogService.log(
      user.id,
      user.fullname ?? user.id,
      AuditAction.TICKET_STATUS_CHANGED,
      'ticket',
      id,
      { from: previousStatus, to: nextStatus },
    );

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('Murojaat topilmadi.');
    return updated;
  }

  async assign(id: string, assignedToId: string | null, actor: User): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    const previousAssignedToId = ticket.assignedToId;
    ticket.assignedToId = assignedToId;
    await this.ticketsRepository.save(ticket);

    await this.auditLogService.log(
      actor.id,
      actor.fullname ?? actor.adminLogin ?? actor.id,
      AuditAction.TICKET_ASSIGNED,
      'ticket',
      id,
      { from: previousAssignedToId, to: assignedToId },
    );

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
      relations: ['assignedTo', 'organization', 'categoryEntity'],
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
    // byAssignee periodTickets'dan quriladi, lekin assignedToId berilsa faqat o'sha bitta
    // ijrochiga qisqartiriladi (pastdagi assigneeGroups guruhlash bosqichida).
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

    // "Kim qancha ishladi" — ijrochi bo'yicha guruhlash (GROUP BY assigned_to_id).
    // assignedToId filtri berilmagan bo'lsa — barcha xodimlarni solishtirib qaytaradi (hozirgidek).
    // Berilgan bo'lsa — bu endi "solishtirish" emas, faqat o'sha bitta ijrochining profilini
    // qaytaradi (bitta qator).
    const assigneeGroups = new Map<string, { fullname: string | null; tickets: Ticket[] }>();
    for (const t of periodTickets) {
      if (!t.assignedToId) continue;
      if (filter.assignedToId && t.assignedToId !== filter.assignedToId) continue;
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

        const statusBreakdown: AssigneeStatusBreakdown = {
          pending: group.tickets.filter(
            (t) => t.status === TicketStatus.NEW || t.status === TicketStatus.WAITING_USER,
          ).length,
          inProgress: group.tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
          resolved: group.tickets.filter(
            (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED,
          ).length,
        };
        const reopenedCount = group.tickets.reduce((sum, t) => sum + t.reopenedCount, 0);

        return {
          userId,
          fullname: group.fullname,
          ticketsAssignedTotal: group.tickets.length,
          ticketsOpenNow: openNowByAssignee.get(userId) ?? 0,
          ticketsClosed: closed.length,
          closedByPriority,
          statusBreakdown,
          avgResolutionMinutes: average(
            closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
          ),
          slaResolutionBreachCount,
          slaComplianceRate,
          productivityScore: calculateProductivityScore(closed.length, group.tickets.length),
          closeRate:
            group.tickets.length > 0 ? Math.round((closed.length / group.tickets.length) * 100) : 0,
          reopenedCount,
          reopenedRate: group.tickets.length > 0 ? Math.round((reopenedCount / group.tickets.length) * 100) : 0,
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
          closedCount: closed.length,
          openCount: group.tickets.length - closed.length,
          avgResolutionMinutes: average(
            closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes!),
          ),
        };
      })
      .sort((a, b) => b.ticketsCount - a.ticketsCount);

    // Kategoriya bo'yicha guruhlash — byOrganization bilan bir xil naqsh.
    const categoryGroups = new Map<string, { name: string; tickets: Ticket[] }>();
    for (const t of generalTickets) {
      if (!t.categoryId) continue;
      if (!categoryGroups.has(t.categoryId)) {
        categoryGroups.set(t.categoryId, {
          name: t.categoryEntity?.name ?? '—',
          tickets: [],
        });
      }
      categoryGroups.get(t.categoryId)!.tickets.push(t);
    }
    const byCategory: CategoryStats[] = Array.from(categoryGroups.entries())
      .map(([categoryId, group]) => {
        const closed = group.tickets.filter((t) => t.status === TicketStatus.CLOSED);
        return {
          categoryId,
          categoryName: group.name,
          ticketsCount: group.tickets.length,
          closedCount: closed.length,
          openCount: group.tickets.length - closed.length,
        };
      })
      .sort((a, b) => b.ticketsCount - a.ticketsCount);

    const avgProductivityScore = average(byAssignee.map((a) => a.productivityScore));

    const trendDays = daysBetweenInclusive(period.start, period.end);

    // resolutionFlow — barcha faol filtrlar (ijrochi, tashkilot, kategoriya, sana) qo'llanilgan
    // generalTickets to'plamidan, lekin doim fiksirlangan TREND_DAYS kunlik oynada.
    const resolutionFlowEnd = filter.dateTo ?? now;
    const resolutionFlowStart = new Date(resolutionFlowEnd);
    resolutionFlowStart.setDate(resolutionFlowStart.getDate() - (TREND_DAYS - 1));

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
      avgProductivityScore,
      byAssignee,
      byOrganization,
      byCategory,
      dailyTrend: buildDailyTrend(generalTickets, period.start, trendDays),
      assigneeResolutionTrend: buildAssigneeResolutionTrend(periodTickets, assigneeGroups, period.start, trendDays),
      resolutionFlow: buildResolutionFlow(generalTickets, resolutionFlowStart, TREND_DAYS),
      workloadHeatmap: buildWorkloadHeatmap(periodTickets, assigneeGroups, period.start, trendDays),
      slaThresholds: {
        resolution: SLA_RESOLUTION_MINUTES,
      },
    };
  }
}
