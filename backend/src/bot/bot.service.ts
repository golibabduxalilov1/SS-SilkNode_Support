import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';

/**
 * Telegraf instansiyasini o'raydi. Handlerlarni ro'yxatdan o'tkazish va
 * botni ishga tushirish BotUpdate.onModuleInit()'da amalga oshiriladi —
 * shu tartib bilan launch() chaqirilguncha barcha handlerlar ulangan bo'ladi.
 */
@Injectable()
export class BotService implements OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  public readonly bot: Telegraf;

  constructor() {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      this.logger.warn('BOT_TOKEN sozlanmagan — bot ishga tushirilmaydi.');
    }
    this.bot = new Telegraf(token || 'disabled');
  }

  onModuleDestroy() {
    if (process.env.BOT_TOKEN) this.bot.stop('SIGTERM');
  }

  async sendMessage(telegramId: string, text: string): Promise<void> {
    if (!process.env.BOT_TOKEN) return;
    try {
      await this.bot.telegram.sendMessage(telegramId, text);
    } catch (err) {
      this.logger.error(`Xabar yuborib bo'lmadi (telegramId=${telegramId}): ${err.message}`);
    }
  }
}
