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
  /**
   * T27 — guruh-murojaatchilar (bitta telefon raqamidan bir nechta kishi qo'ng'iroq qiladigan
   * holatlar, masalan tashkilot qabulxonasi) uchun: shu telefon raqami bo'yicha tickets jadvalida
   * qayd etilgan barcha turli xil ismlar, eng so'nggisidan boshlab. Alohida "requester" jadvali
   * qo'shilmadi (ТЗ band 8 — dublikatsiyaga yo'l qo'ymaslik prinsipi saqlanadi); ismlar mavjud
   * requesterName/createdBy.fullname ustunlaridan hosil qilinadi. `name` — shulardan birinchisi
   * (eng so'nggi murojaatdagi ism), orqaga moslik uchun saqlanadi.
   */
  contactNames: string[];
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

function nameForTicket(ticket: Ticket): string | null {
  const name = ticket.requesterName ?? ticket.createdBy?.fullname ?? null;
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

/** tickets — createdAt bo'yicha DESC tartiblangan, shu sababli natija ham "eng so'nggidan" boshlanadi. */
function distinctContactNames(tickets: Ticket[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const ticket of tickets) {
    const name = nameForTicket(ticket);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
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

  /**
   * T03 — telefon bo'yicha mavjud murojaatchini taklif qilish uchun qisman moslik qidiruvi.
   * Kamida 7 ta raqam talab qilinadi (frontend debounce bilan shuni ta'minlaydi), aks holda bo'sh qaytadi.
   */
  async search(phoneQuery: string): Promise<RequesterSummary[]> {
    const digits = normalizePhone(phoneQuery).replace(/^\+/, '');
    if (digits.length < 7) return [];

    const tickets = await this.ticketsRepository.find({
      relations: ['organization', 'createdBy'],
      order: { createdAt: 'DESC' },
    });

    const groups = new Map<string, Ticket[]>();
    for (const ticket of tickets) {
      const phone = ticket.requesterPhone ?? ticket.createdBy?.phoneNumber ?? null;
      if (!phone) continue;
      if (!normalizePhone(phone).replace(/^\+/, '').includes(digits)) continue;
      const key = keyForTicket(ticket);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ticket);
    }

    const summaries = Array.from(groups.entries()).map(([key, group]) => this.summarize(key, group));
    return summaries.sort((a, b) => b.lastTicketAt.getTime() - a.lastTicketAt.getTime()).slice(0, 5);
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
    const contactNames = distinctContactNames(tickets);
    return {
      key,
      name: contactNames[0] ?? null,
      phone: latest.requesterPhone ?? latest.createdBy?.phoneNumber ?? null,
      organizationId: latest.organizationId,
      organizationName: latest.organization?.name ?? null,
      ticketsCount: tickets.length,
      lastTicketAt: latest.createdAt,
      contactNames,
    };
  }
}
