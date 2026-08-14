import { Ticket } from '../../tickets/entities/ticket.entity';
export declare class Category {
    id: string;
    name: string;
    isActive: boolean;
    tickets: Ticket[];
    createdAt: Date;
    updatedAt: Date;
}
