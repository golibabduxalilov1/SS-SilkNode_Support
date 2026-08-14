import { Message } from '../../messages/entities/message.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
export declare class Attachment {
    id: string;
    ticket: Ticket;
    ticketId: string;
    message: Message | null;
    messageId: string | null;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    sizeBytes: string;
    createdAt: Date;
}
