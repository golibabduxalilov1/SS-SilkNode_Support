import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
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
    productivityScore: number;
    closeRate: number;
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
export interface DailyTrendPoint {
    date: string;
    created: number;
    closed: number;
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
    avgProductivityScore: number | null;
    byAssignee: AssigneeStats[];
    byOrganization: OrganizationStats[];
    dailyTrend: DailyTrendPoint[];
    assigneeResolutionTrend: AssigneeResolutionTrendPoint[];
    resolutionFlow: ResolutionFlowPoint[];
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
export declare class TicketsService {
    private readonly ticketsRepository;
    constructor(ticketsRepository: Repository<Ticket>);
    private generateTicketNumber;
    create(dto: CreateTicketDto, createdBy: User): Promise<Ticket>;
    findMine(userId: string): Promise<Ticket[]>;
    findOneForUser(id: string, userId: string): Promise<Ticket>;
    findAllForAdmin(): Promise<Ticket[]>;
    findById(id: string): Promise<Ticket | null>;
    updateStatus(id: string, status: TicketStatus): Promise<Ticket>;
    assign(id: string, assignedToId: string | null): Promise<Ticket>;
    remove(id: string): Promise<void>;
    getDashboardStats(filter?: DashboardStatsFilter): Promise<DashboardStats>;
}
