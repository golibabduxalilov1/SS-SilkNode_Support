import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
export declare class Organization {
    id: string;
    name: string;
    isActive: boolean;
    users: User[];
    tickets: Ticket[];
    createdAt: Date;
    updatedAt: Date;
}
