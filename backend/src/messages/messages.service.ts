import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageVisibility } from './entities/message.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async create(
    ticketId: string,
    senderId: string,
    text: string,
    visibility: MessageVisibility = MessageVisibility.PUBLIC,
  ): Promise<Message> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    const message = this.messagesRepository.create({ ticketId, senderId, text, visibility });
    return this.messagesRepository.save(message);
  }

  /**
   * publicOnly=true — Mini App (mijoz) tomoni uchun: ichki eslatmalar hech qachon
   * mijozga ko'rinmasligi kerak (T04 qabul mezoni).
   */
  findByTicket(ticketId: string, options?: { publicOnly?: boolean }): Promise<Message[]> {
    return this.messagesRepository.find({
      where: options?.publicOnly ? { ticketId, visibility: MessageVisibility.PUBLIC } : { ticketId },
      relations: ['sender', 'attachments'],
      order: { createdAt: 'ASC' },
    });
  }

  async findTicketOwnerId(ticketId: string): Promise<string | null> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    return ticket?.createdById ?? null;
  }

  findTicketForNotification(ticketId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['createdBy'],
    });
  }
}
