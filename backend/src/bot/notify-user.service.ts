import { Injectable } from '@nestjs/common';
import { BotService } from './bot.service';
import { Ticket } from '../tickets/entities/ticket.entity';

/**
 * TZ bo'lim 5: admin/texnik mutaxassis murojaatga javob yozganda, murojaat
 * egasiga Telegram orqali "Murojaatni ochish" tugmasi bilan bildirishnoma
 * yuboriladi (mavjud NotifyAdminsService'ga o'xshash struktura, faqat
 * yo'nalishi teskari — admin -> foydalanuvchi).
 */
@Injectable()
export class NotifyUserService {
  constructor(private readonly botService: BotService) {}

  async notifyNewMessage(ticket: Ticket, messageText: string): Promise<void> {
    if (!ticket.createdBy?.telegramId) return;

    const preview =
      messageText.length > 200 ? `${messageText.slice(0, 200)}…` : messageText;

    const text =
      `💬 Murojaatingizga javob keldi #${ticket.number}\n` +
      `Mavzu: ${ticket.title}\n\n` +
      `${preview}`;

    const miniAppUrl = process.env.MINI_APP_URL || '';
    const ticketUrl = miniAppUrl ? `${miniAppUrl}?ticketId=${ticket.id}` : miniAppUrl;

    await this.botService.sendMessageWithWebAppButton(
      ticket.createdBy.telegramId,
      text,
      'Murojaatni ochish',
      ticketUrl,
    );
  }
}
