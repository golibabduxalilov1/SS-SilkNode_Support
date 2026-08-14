import { BotService } from './bot.service';
import { Ticket } from '../tickets/entities/ticket.entity';
export declare class NotifyUserService {
    private readonly botService;
    constructor(botService: BotService);
    notifyNewMessage(ticket: Ticket, messageText: string): Promise<void>;
}
