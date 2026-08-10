import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

function diffMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

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
    isAdminSender = false,
  ): Promise<Message> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi.');

    const message = this.messagesRepository.create({ ticketId, senderId, text });
    const saved = await this.messagesRepository.save(message);

    // Time Tracking (TZ bo'lim 8): birinchi marta admin javob yozganda belgilanadi.
    if (isAdminSender && !ticket.firstResponseAt) {
      const now = new Date();
      ticket.firstResponseAt = now;
      ticket.firstResponseMinutes = diffMinutes(ticket.createdAt, now);
      await this.ticketsRepository.save(ticket);
    }

    return saved;
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

  findTicketForNotification(ticketId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['createdBy'],
    });
  }
}
