import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';
import { Attachment } from '../../attachments/entities/attachment.entity';
export declare class Message {
    id: string;
    ticket: Ticket;
    ticketId: string;
    sender: User;
    senderId: string;
    text: string;
    attachments: Attachment[];
    createdAt: Date;
}
