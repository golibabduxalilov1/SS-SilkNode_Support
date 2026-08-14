import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
export declare class MessagesService {
    private readonly messagesRepository;
    private readonly ticketsRepository;
    constructor(messagesRepository: Repository<Message>, ticketsRepository: Repository<Ticket>);
    create(ticketId: string, senderId: string, text: string): Promise<Message>;
    findByTicket(ticketId: string): Promise<Message[]>;
    findTicketOwnerId(ticketId: string): Promise<string | null>;
    findTicketForNotification(ticketId: string): Promise<Ticket | null>;
}
