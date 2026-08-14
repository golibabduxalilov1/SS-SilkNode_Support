import { TicketPriority } from '../entities/ticket.entity';
export declare class CreateTicketDto {
    title: string;
    description: string;
    categoryId: string;
    priority?: TicketPriority;
    organizationId?: string;
}
