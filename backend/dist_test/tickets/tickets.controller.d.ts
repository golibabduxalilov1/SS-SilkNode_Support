import { TicketsService } from './tickets.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CategoriesService } from '../categories/categories.service';
import { NotifyAdminsService } from '../bot/notify-admins.service';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { User } from '../users/entities/user.entity';
export declare class TicketsController {
    private readonly ticketsService;
    private readonly organizationsService;
    private readonly categoriesService;
    private readonly notifyAdminsService;
    private readonly usersService;
    constructor(ticketsService: TicketsService, organizationsService: OrganizationsService, categoriesService: CategoriesService, notifyAdminsService: NotifyAdminsService, usersService: UsersService);
    create(dto: CreateTicketDto, user: User): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket;
    }>;
    findMine(user: User): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket[];
    }>;
    findOneMine(id: string, user: User): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket;
    }>;
    findAllForAdmin(): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket[];
    }>;
    getDashboardStats(organizationId?: string, assignedToId?: string, categoryId?: string, dateFrom?: string, dateTo?: string): Promise<{
        success: boolean;
        data: import("./tickets.service").DashboardStats;
    }>;
    findAdmins(): Promise<{
        success: boolean;
        data: User[];
    }>;
    findOneForAdmin(id: string): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket | null;
    }>;
    updateStatus(id: string, dto: UpdateTicketStatusDto): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket;
    }>;
    assign(id: string, dto: AssignTicketDto): Promise<{
        success: boolean;
        data: import("./entities/ticket.entity").Ticket;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
