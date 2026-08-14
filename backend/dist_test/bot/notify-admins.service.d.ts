import { BotService } from './bot.service';
import { UsersService } from '../users/users.service';
import { Ticket } from '../tickets/entities/ticket.entity';
export declare class NotifyAdminsService {
    private readonly botService;
    private readonly usersService;
    constructor(botService: BotService, usersService: UsersService);
    notifyNewTicket(ticket: Ticket, organizationName: string, categoryName: string): Promise<void>;
}
