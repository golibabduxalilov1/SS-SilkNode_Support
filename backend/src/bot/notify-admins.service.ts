import { Injectable } from '@nestjs/common';
import { BotService } from './bot.service';
import { UsersService } from '../users/users.service';
import { Ticket } from '../tickets/entities/ticket.entity';

/**
 * TALAB 2 / bo'lim 5.2: admin/superadmin'larga faqat oddiy Telegram matn
 * xabari yuboriladi — hech qanday inline tugma yoki Mini App havolasi bilan
 * emas (sendMessage'ga reply_markup berilmaydi).
 */
@Injectable()
export class NotifyAdminsService {
  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
  ) {}

  async notifyNewTicket(
    ticket: Ticket,
    organizationName: string,
    categoryName: string,
  ): Promise<void> {
    const admins = await this.usersService.findAdmins();

    const text =
      `🔔 Yangi murojaat #${ticket.number}\n` +
      `Tashkilot: ${organizationName}\n` +
      `Mavzu: ${ticket.title}\n` +
      `Kategoriya: ${categoryName}\n` +
      `Muhimlik: ${ticket.priority}\n\n` +
      `Batafsil: Web Admin Panel orqali ko'ring.`;

    for (const admin of admins) {
      if (!admin.telegramId) continue;
      // Faqat oddiy matn xabar — tugma yoki webApp havolasi YO'Q (bo'lim 5.2, 5.3).
      await this.botService.sendMessage(admin.telegramId, text);
    }
  }
}
