import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/entities/user.entity';
import { NotifyUserService } from '../bot/notify-user.service';
export declare class MessagesController {
    private readonly messagesService;
    private readonly notifyUserService;
    constructor(messagesService: MessagesService, notifyUserService: NotifyUserService);
    findMine(ticketId: string, user: User): Promise<{
        success: boolean;
        data: import("./entities/message.entity").Message[];
    }>;
    createMine(ticketId: string, dto: CreateMessageDto, user: User): Promise<{
        success: boolean;
        data: import("./entities/message.entity").Message;
    }>;
    findForAdmin(ticketId: string): Promise<{
        success: boolean;
        data: import("./entities/message.entity").Message[];
    }>;
    createForAdmin(ticketId: string, dto: CreateMessageDto, admin: User): Promise<{
        success: boolean;
        data: import("./entities/message.entity").Message;
    }>;
    private assertOwnsTicket;
}
