import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { TicketsService } from '../tickets/tickets.service';
import { MessagesService } from '../messages/messages.service';
import { NotifyUserService } from '../bot/notify-user.service';
import { BotService } from '../bot/bot.service';
import { User } from '../users/entities/user.entity';
export declare class AttachmentsController {
    private readonly attachmentsService;
    private readonly ticketsService;
    private readonly messagesService;
    private readonly notifyUserService;
    private readonly botService;
    constructor(attachmentsService: AttachmentsService, ticketsService: TicketsService, messagesService: MessagesService, notifyUserService: NotifyUserService, botService: BotService);
    uploadMine(ticketId: string, file: Express.Multer.File, user: User): Promise<{
        success: boolean;
        data: import("./entities/attachment.entity").Attachment;
    }>;
    uploadForAdmin(ticketId: string, file: Express.Multer.File, admin: User): Promise<{
        success: boolean;
        data: import("./entities/attachment.entity").Attachment;
    }>;
    findMine(ticketId: string, user: User): Promise<{
        success: boolean;
        data: import("./entities/attachment.entity").Attachment[];
    }>;
    findForAdmin(ticketId: string): Promise<{
        success: boolean;
        data: import("./entities/attachment.entity").Attachment[];
    }>;
    downloadMine(ticketId: string, attachmentId: string, user: User, res: Response): Promise<void>;
    downloadForAdmin(ticketId: string, attachmentId: string, res: Response): Promise<void>;
    deliverMine(ticketId: string, attachmentId: string, user: User): Promise<{
        success: boolean;
    }>;
    private streamAttachment;
}
