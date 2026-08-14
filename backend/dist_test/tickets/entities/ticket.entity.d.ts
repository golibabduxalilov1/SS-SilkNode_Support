import { Organization } from '../../organizations/entities/organization.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from '../../messages/entities/message.entity';
export declare enum TicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum TicketStatus {
    NEW = "new",
    IN_PROGRESS = "in_progress",
    WAITING_USER = "waiting_user",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare class Ticket {
    id: string;
    number: string;
    title: string;
    description: string;
    categoryEntity: Category | null;
    categoryId: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    organization: Organization | null;
    organizationId: string | null;
    createdBy: User;
    createdById: string;
    assignedTo: User | null;
    assignedToId: string | null;
    messages: Message[];
    closedAt: Date | null;
    resolutionMinutes: number | null;
    createdAt: Date;
    updatedAt: Date;
}
