"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ticket_entity_1 = require("./entities/ticket.entity");
const SLA_RESOLUTION_MINUTES = 1440;
const DEFAULT_TREND_PERIOD_DAYS = 30;
const MAX_TREND_DAYS = 180;
const TREND_DAYS = 14;
function diffMinutes(from, to) {
    return Math.round((to.getTime() - from.getTime()) / 60000);
}
function average(values) {
    if (values.length === 0)
        return null;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
}
function startOfMonth(date) {
    const d = startOfDay(date);
    d.setDate(1);
    return d;
}
function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function percentChange(curr, prev) {
    if (prev === 0)
        return curr === 0 ? 0 : 100;
    return Math.round(((curr - prev) / prev) * 100);
}
function calculateProductivityScore(closedCount, assignedTotal) {
    if (assignedTotal === 0)
        return 0;
    return Math.round((closedCount / assignedTotal) * 100);
}
function matchesOrgCategory(ticket, filter) {
    if (filter.organizationId && ticket.organizationId !== filter.organizationId)
        return false;
    if (filter.categoryId && ticket.categoryId !== filter.categoryId)
        return false;
    return true;
}
function matchesDateRange(ticket, dateFrom, dateTo) {
    if (dateFrom && ticket.createdAt < dateFrom)
        return false;
    if (dateTo && ticket.createdAt > dateTo)
        return false;
    return true;
}
function resolvePeriod(dateFrom, dateTo, now) {
    if (dateFrom && dateTo)
        return { start: dateFrom, end: dateTo };
    if (dateFrom && !dateTo)
        return { start: dateFrom, end: now };
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
function daysBetweenInclusive(start, end) {
    const days = Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1;
    return Math.min(MAX_TREND_DAYS, Math.max(1, days));
}
function buildDailyTrend(tickets, start, days) {
    const buckets = new Map();
    const rangeStart = startOfDay(start);
    for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        const key = dateKey(d);
        buckets.set(key, { date: key, created: 0, closed: 0, open: 0 });
    }
    for (const t of tickets) {
        const createdBucket = buckets.get(dateKey(t.createdAt));
        if (createdBucket)
            createdBucket.created += 1;
        if (t.status === ticket_entity_1.TicketStatus.CLOSED && t.closedAt) {
            const closedBucket = buckets.get(dateKey(t.closedAt));
            if (closedBucket)
                closedBucket.closed += 1;
        }
    }
    let running = 0;
    for (const bucket of buckets.values()) {
        running += bucket.created - bucket.closed;
        bucket.open = running;
    }
    return Array.from(buckets.values());
}
function buildResolutionFlow(tickets, start, days) {
    const buckets = new Map();
    const rangeStart = startOfDay(start);
    for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        const key = dateKey(d);
        buckets.set(key, { date: key, opened: 0, resolved: 0 });
    }
    for (const t of tickets) {
        const openedBucket = buckets.get(dateKey(t.createdAt));
        if (openedBucket)
            openedBucket.opened += 1;
        if (t.status === ticket_entity_1.TicketStatus.CLOSED && t.closedAt) {
            const resolvedBucket = buckets.get(dateKey(t.closedAt));
            if (resolvedBucket)
                resolvedBucket.resolved += 1;
        }
        else if (t.status === ticket_entity_1.TicketStatus.RESOLVED) {
            const resolvedBucket = buckets.get(dateKey(t.updatedAt));
            if (resolvedBucket)
                resolvedBucket.resolved += 1;
        }
    }
    return Array.from(buckets.values());
}
function buildAssigneeResolutionTrend(tickets, assigneeGroups, start, days) {
    const rangeStart = startOfDay(start);
    const buckets = new Map();
    const bucketOrder = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        const key = dateKey(d);
        buckets.set(key, new Map());
        bucketOrder.push(key);
    }
    for (const t of tickets) {
        if (!t.assignedToId || t.status !== ticket_entity_1.TicketStatus.CLOSED || !t.closedAt)
            continue;
        const bucket = buckets.get(dateKey(t.closedAt));
        if (!bucket)
            continue;
        bucket.set(t.assignedToId, (bucket.get(t.assignedToId) ?? 0) + 1);
    }
    return bucketOrder.map((date) => {
        const bucket = buckets.get(date);
        const byAssignee = Array.from(bucket.entries()).map(([userId, closedCount]) => ({
            userId,
            fullname: assigneeGroups.get(userId)?.fullname ?? null,
            closedCount,
        }));
        return { date, byAssignee };
    });
}
let TicketsService = class TicketsService {
    constructor(ticketsRepository) {
        this.ticketsRepository = ticketsRepository;
    }
    generateTicketNumber() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `TCK-${datePart}-${randomPart}`;
    }
    async create(dto, createdBy) {
        const ticket = this.ticketsRepository.create({
            number: this.generateTicketNumber(),
            title: dto.title,
            description: dto.description,
            categoryId: dto.categoryId,
            priority: dto.priority ?? ticket_entity_1.TicketPriority.MEDIUM,
            organizationId: dto.organizationId ?? createdBy.organizationId ?? null,
            createdById: createdBy.id,
        });
        return this.ticketsRepository.save(ticket);
    }
    findMine(userId) {
        return this.ticketsRepository.find({
            where: { createdById: userId },
            relations: ['organization', 'categoryEntity'],
            order: { createdAt: 'DESC' },
        });
    }
    async findOneForUser(id, userId) {
        const ticket = await this.ticketsRepository.findOne({
            where: { id },
            relations: ['organization', 'categoryEntity', 'createdBy', 'assignedTo', 'messages'],
        });
        if (!ticket || ticket.createdById !== userId) {
            throw new common_1.NotFoundException('Murojaat topilmadi.');
        }
        return ticket;
    }
    findAllForAdmin() {
        return this.ticketsRepository.find({
            relations: ['organization', 'categoryEntity', 'createdBy', 'assignedTo', 'messages'],
            order: { createdAt: 'DESC' },
        });
    }
    findById(id) {
        return this.ticketsRepository.findOne({
            where: { id },
            relations: ['organization', 'categoryEntity', 'createdBy', 'assignedTo', 'messages'],
        });
    }
    async updateStatus(id, status) {
        const ticket = await this.ticketsRepository.findOne({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Murojaat topilmadi.');
        ticket.status = status;
        if (status === ticket_entity_1.TicketStatus.CLOSED) {
            const now = new Date();
            ticket.closedAt = now;
            ticket.resolutionMinutes = diffMinutes(ticket.createdAt, now);
        }
        await this.ticketsRepository.save(ticket);
        const updated = await this.findById(id);
        if (!updated)
            throw new common_1.NotFoundException('Murojaat topilmadi.');
        return updated;
    }
    async assign(id, assignedToId) {
        const ticket = await this.ticketsRepository.findOne({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Murojaat topilmadi.');
        ticket.assignedToId = assignedToId;
        await this.ticketsRepository.save(ticket);
        const updated = await this.findById(id);
        if (!updated)
            throw new common_1.NotFoundException('Murojaat topilmadi.');
        return updated;
    }
    async remove(id) {
        const ticket = await this.ticketsRepository.findOne({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Murojaat topilmadi.');
        await this.ticketsRepository.remove(ticket);
    }
    async getDashboardStats(filter = {}) {
        const tickets = await this.ticketsRepository.find({
            relations: ['assignedTo', 'organization'],
        });
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfWeek(now);
        const monthStart = startOfMonth(now);
        const orgCategoryTickets = tickets.filter((t) => matchesOrgCategory(t, filter));
        const periodTickets = orgCategoryTickets.filter((t) => matchesDateRange(t, filter.dateFrom, filter.dateTo));
        const generalTickets = filter.assignedToId
            ? periodTickets.filter((t) => t.assignedToId === filter.assignedToId)
            : periodTickets;
        const statusCount = (status) => generalTickets.filter((t) => t.status === status).length;
        const closedTickets = generalTickets.filter((t) => t.status === ticket_entity_1.TicketStatus.CLOSED && t.closedAt);
        const closedToday = closedTickets.filter((t) => t.closedAt >= todayStart).length;
        const closedThisWeek = closedTickets.filter((t) => t.closedAt >= weekStart).length;
        const closedThisMonth = closedTickets.filter((t) => t.closedAt >= monthStart).length;
        const avgResolutionMinutes = average(closedTickets.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes));
        const openStatuses = [
            ticket_entity_1.TicketStatus.NEW,
            ticket_entity_1.TicketStatus.IN_PROGRESS,
            ticket_entity_1.TicketStatus.WAITING_USER,
            ticket_entity_1.TicketStatus.RESOLVED,
        ];
        const allOpen = generalTickets.filter((t) => openStatuses.includes(t.status)).length;
        const openNowByAssignee = new Map();
        for (const t of orgCategoryTickets) {
            if (!t.assignedToId || !openStatuses.includes(t.status))
                continue;
            openNowByAssignee.set(t.assignedToId, (openNowByAssignee.get(t.assignedToId) ?? 0) + 1);
        }
        const period = resolvePeriod(filter.dateFrom, filter.dateTo, now);
        const periodLengthMs = period.end.getTime() - period.start.getTime();
        const previousPeriod = {
            start: new Date(period.start.getTime() - periodLengthMs),
            end: period.start,
        };
        const closedClosedInWindow = (start, end) => orgCategoryTickets.filter((t) => t.status === ticket_entity_1.TicketStatus.CLOSED && t.closedAt && t.closedAt >= start && t.closedAt < end);
        const closedCurrentByAssignee = new Map();
        for (const t of closedClosedInWindow(period.start, period.end)) {
            if (!t.assignedToId)
                continue;
            closedCurrentByAssignee.set(t.assignedToId, (closedCurrentByAssignee.get(t.assignedToId) ?? 0) + 1);
        }
        const closedPreviousByAssignee = new Map();
        for (const t of closedClosedInWindow(previousPeriod.start, previousPeriod.end)) {
            if (!t.assignedToId)
                continue;
            closedPreviousByAssignee.set(t.assignedToId, (closedPreviousByAssignee.get(t.assignedToId) ?? 0) + 1);
        }
        const assigneeGroups = new Map();
        for (const t of periodTickets) {
            if (!t.assignedToId)
                continue;
            if (filter.assignedToId && t.assignedToId !== filter.assignedToId)
                continue;
            if (!assigneeGroups.has(t.assignedToId)) {
                assigneeGroups.set(t.assignedToId, {
                    fullname: t.assignedTo?.fullname ?? null,
                    tickets: [],
                });
            }
            assigneeGroups.get(t.assignedToId).tickets.push(t);
        }
        const byAssignee = Array.from(assigneeGroups.entries())
            .map(([userId, group]) => {
            const closed = group.tickets.filter((t) => t.status === ticket_entity_1.TicketStatus.CLOSED);
            const closedByPriority = {
                low: closed.filter((t) => t.priority === ticket_entity_1.TicketPriority.LOW).length,
                medium: closed.filter((t) => t.priority === ticket_entity_1.TicketPriority.MEDIUM).length,
                high: closed.filter((t) => t.priority === ticket_entity_1.TicketPriority.HIGH).length,
                critical: closed.filter((t) => t.priority === ticket_entity_1.TicketPriority.CRITICAL).length,
            };
            const slaResolutionBreachCount = closed.filter((t) => t.resolutionMinutes != null && t.resolutionMinutes > SLA_RESOLUTION_MINUTES).length;
            const slaComplianceRate = closed.length > 0
                ? Math.round(((closed.length - slaResolutionBreachCount) / closed.length) * 100)
                : 100;
            return {
                userId,
                fullname: group.fullname,
                ticketsAssignedTotal: group.tickets.length,
                ticketsOpenNow: openNowByAssignee.get(userId) ?? 0,
                ticketsClosed: closed.length,
                closedByPriority,
                avgResolutionMinutes: average(closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes)),
                slaResolutionBreachCount,
                slaComplianceRate,
                productivityScore: calculateProductivityScore(closed.length, group.tickets.length),
                closeRate: group.tickets.length > 0 ? Math.round((closed.length / group.tickets.length) * 100) : 0,
                trendVsPreviousPeriod: {
                    ticketsClosedDelta: percentChange(closedCurrentByAssignee.get(userId) ?? 0, closedPreviousByAssignee.get(userId) ?? 0),
                },
            };
        })
            .sort((a, b) => (a.fullname ?? '').localeCompare(b.fullname ?? ''));
        const organizationGroups = new Map();
        for (const t of generalTickets) {
            if (!t.organizationId)
                continue;
            if (!organizationGroups.has(t.organizationId)) {
                organizationGroups.set(t.organizationId, {
                    name: t.organization?.name ?? '—',
                    tickets: [],
                });
            }
            organizationGroups.get(t.organizationId).tickets.push(t);
        }
        const byOrganization = Array.from(organizationGroups.entries())
            .map(([organizationId, group]) => {
            const closed = group.tickets.filter((t) => t.status === ticket_entity_1.TicketStatus.CLOSED);
            return {
                organizationId,
                organizationName: group.name,
                ticketsCount: group.tickets.length,
                closedCount: closed.length,
                openCount: group.tickets.length - closed.length,
                avgResolutionMinutes: average(closed.filter((t) => t.resolutionMinutes != null).map((t) => t.resolutionMinutes)),
            };
        })
            .sort((a, b) => b.ticketsCount - a.ticketsCount);
        const avgProductivityScore = average(byAssignee.map((a) => a.productivityScore));
        const trendDays = daysBetweenInclusive(period.start, period.end);
        const resolutionFlowEnd = filter.dateTo ?? now;
        const resolutionFlowStart = new Date(resolutionFlowEnd);
        resolutionFlowStart.setDate(resolutionFlowStart.getDate() - (TREND_DAYS - 1));
        return {
            statusCounts: {
                new: statusCount(ticket_entity_1.TicketStatus.NEW),
                in_progress: statusCount(ticket_entity_1.TicketStatus.IN_PROGRESS),
                waiting_user: statusCount(ticket_entity_1.TicketStatus.WAITING_USER),
                resolved: statusCount(ticket_entity_1.TicketStatus.RESOLVED),
                closed: statusCount(ticket_entity_1.TicketStatus.CLOSED),
            },
            allOpen,
            closedToday,
            closedThisWeek,
            closedThisMonth,
            avgResolutionMinutes,
            avgProductivityScore,
            byAssignee,
            byOrganization,
            dailyTrend: buildDailyTrend(generalTickets, period.start, trendDays),
            assigneeResolutionTrend: buildAssigneeResolutionTrend(periodTickets, assigneeGroups, period.start, trendDays),
            resolutionFlow: buildResolutionFlow(generalTickets, resolutionFlowStart, TREND_DAYS),
            slaThresholds: {
                resolution: SLA_RESOLUTION_MINUTES,
            },
        };
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map