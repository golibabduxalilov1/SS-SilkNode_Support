import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async create(ticketId: string, senderId: string, text: string): Promise<Message> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    const message = this.messagesRepository.create({ ticketId, senderId, text });
    return this.messagesRepository.save(message);
  }

  findByTicket(ticketId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { ticketId },
      relations: ['sender', 'attachments'],
      order: { createdAt: 'ASC' },
    });
  }

  async findTicketOwnerId(ticketId: string): Promise<string | null> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    return ticket?.createdById ?? null;
  }
}
