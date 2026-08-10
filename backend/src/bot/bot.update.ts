import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Markup } from 'telegraf';
import { BotService } from './bot.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { normalizeToE164 } from './utils/phone.util';
import { isValidMiniAppUrl } from '../config/env.validation';

/**
 * Bo'lim 4.1: /start va contact handlerlar. Handlerlar shu yerda ro'yxatdan
 * o'tkaziladi, so'ng bot ishga tushiriladi (onModuleInit ichida, shu tartibda).
 */
@Injectable()
export class BotUpdate implements OnModuleInit {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly botService: BotService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    const miniAppUrl = process.env.MINI_APP_URL || '';
    const { bot } = this.botService;

    if (!isValidMiniAppUrl(miniAppUrl)) {
      const message =
        "MINI_APP_URL noto'g'ri sozlangan, Mini App tugmasi ishlamaydi " +
        `(hozirgi qiymat: "${miniAppUrl || '(bo\'sh)'}"). HTTPS domen kerak — ` +
        "aks holda foydalanuvchida \"Webview crashed\" xatosi chiqadi.";
      this.logger.error(message);

      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
    }

    bot.command('start', async (ctx) => {
      const { id: telegramId, first_name, last_name, username } = ctx.from;
      const fullname = [first_name, last_name].filter(Boolean).join(' ');

      const { user, created } = await this.usersService.findOrCreateByTelegramId(
        String(telegramId),
        { fullname, username, isStarted: true, startedAt: new Date() },
      );

      if (!created && !user.isStarted) {
        await this.usersService.markStarted(String(telegramId));
      }

      // TALAB 2 / bo'lim 5.2: admin/superadmin'larga hech qanday tugma yoki
      // Mini App havolasi ko'rsatilmaydi va telefon tekshiruvi talab qilinmaydi —
      // ular Web Admin Panel'ga admin_login + parol orqali kirishadi.
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) {
        return ctx.reply(
          'Xush kelibsiz! Siz administrator sifatida ro\'yxatdan o\'tgansiz. ' +
            'Yangi murojaatlar haqida shu chatga bildirishnoma kelib turadi. ' +
            "Boshqaruv uchun Web Admin Panel'dan foydalaning.",
        );
      }

      if (!user.isPhoneVerified) {
        return ctx.reply(
          'Xush kelibsiz! Davom etish uchun telefon raqamingizni tasdiqlang.',
          Markup.keyboard([Markup.button.contactRequest('📱 Raqamni yuborish')])
            .resize()
            .oneTime(),
        );
      }

      return ctx.reply(
        'Service Desk tizimiga xush kelibsiz.',
        Markup.inlineKeyboard([Markup.button.webApp("Service Desk'ni ochish", miniAppUrl)]),
      );
    });

    bot.on('contact', async (ctx) => {
      const contact = (ctx.message as { contact: { user_id?: number; phone_number: string } })
        .contact;

      // MUHIM: faqat foydalanuvchining O'Z raqami qabul qilinadi (bo'lim 4.1, 7).
      if (contact.user_id !== ctx.from.id) {
        return ctx.reply("Iltimos, faqat o'zingizning raqamingizni yuboring.");
      }

      const normalizedPhone = normalizeToE164(contact.phone_number);
      await this.usersService.verifyPhone(String(ctx.from.id), normalizedPhone);

      return ctx.reply(
        'Raqamingiz tasdiqlandi. Endi tizimdan foydalanishingiz mumkin.',
        Markup.inlineKeyboard([Markup.button.webApp("Service Desk'ni ochish", miniAppUrl)]),
      );
    });

    if (process.env.BOT_TOKEN) {
      // bot.launch() long-polling paytida hech qachon resolve bo'lmaydi —
      // await qilinsa onModuleInit (demak butun Nest bootstrap) abadiy bloklanadi.
      bot.launch().catch((err) => this.logger.error(`Bot launch xatosi: ${err.message}`));
      this.logger.log('Telegram bot ishga tushdi (long polling).');
    }
  }
}
