import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';

export interface RequesterSummary {
  /** Guruhlash kaliti (telefon yoki foydalanuvchi id) — jadval qatori uchun barqaror id sifatida ishlatiladi. */
  key: string;
  name: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  ticketsCount: number;
  lastTicketAt: Date;
}

export interface RequesterDetail {
  requester: RequesterSummary;
  tickets: Ticket[];
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

function keyForTicket(ticket: Ticket): string {
  return ticket.requesterPhone
    ? `phone:${normalizePhone(ticket.requesterPhone)}`
    : `user:${ticket.createdById}`;
}

/**
 * Murojaatchilar uchun alohida jadval YO'Q (ТЗ band 8 — ma'lumot dublikatsiyasiga yo'l qo'ymaslik):
 * murojaatchi identifikatori tickets jadvalidan hosil qilinadi — admin qo'lda kiritgan
 * murojaatlar uchun requesterPhone, Mini App orqali yaratilganlar uchun createdBy (citizen User).
 */
@Injectable()
export class RequestersService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  async findAll(): Promise<RequesterSummary[]> {
    const tickets = await this.ticketsRepository.find({
      relations: ['organization', 'createdBy'],
      order: { createdAt: 'DESC' },
    });

    const groups = new Map<string, { tickets: Ticket[] }>();
    for (const ticket of tickets) {
      const key = keyForTicket(ticket);
      if (!groups.has(key)) groups.set(key, { tickets: [] });
      groups.get(key)!.tickets.push(ticket);
    }

    const summaries: RequesterSummary[] = Array.from(groups.entries()).map(([key, group]) =>
      this.summarize(key, group.tickets),
    );

    return summaries.sort((a, b) => b.lastTicketAt.getTime() - a.lastTicketAt.getTime());
  }

  async findOne(key: string): Promise<RequesterDetail> {
    const tickets = await this.ticketsRepository.find({
      relations: ['organization', 'createdBy', 'categoryEntity', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });

    const matching = tickets.filter((ticket) => keyForTicket(ticket) === key);
    if (matching.length === 0) {
      throw new NotFoundException('Murojaatchi topilmadi');
    }

    return {
      requester: this.summarize(key, matching),
      tickets: matching,
    };
  }

  private summarize(key: string, tickets: Ticket[]): RequesterSummary {
    // tickets ichida createdAt bo'yicha DESC tartiblangan — birinchi element eng so'nggi murojaat.
    const latest = tickets[0];
    return {
      key,
      name: latest.requesterName ?? latest.createdBy?.fullname ?? null,
      phone: latest.requesterPhone ?? latest.createdBy?.phoneNumber ?? null,
      organizationId: latest.organizationId,
      organizationName: latest.organization?.name ?? null,
      ticketsCount: tickets.length,
      lastTicketAt: latest.createdAt,
    };
  }
}
