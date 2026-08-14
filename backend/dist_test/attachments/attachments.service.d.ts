import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
export declare class AttachmentsService {
    private readonly attachmentsRepository;
    constructor(attachmentsRepository: Repository<Attachment>);
    findByMessage(messageId: string): Promise<Attachment[]>;
    findByTicket(ticketId: string): Promise<Attachment[]>;
    findById(id: string): Promise<Attachment | null>;
    create(data: Partial<Attachment>): Promise<Attachment>;
}
