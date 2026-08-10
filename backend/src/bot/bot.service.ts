import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Markup, Telegraf } from 'telegraf';

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

  /** Mini App'ning muayyan sahifasiga olib boruvchi web_app tugmasi bilan xabar (bo'lim 5). */
  async sendMessageWithWebAppButton(
    telegramId: string,
    text: string,
    buttonText: string,
    webAppUrl: string,
  ): Promise<void> {
    if (!process.env.BOT_TOKEN) return;
    try {
      await this.bot.telegram.sendMessage(
        telegramId,
        text,
        Markup.inlineKeyboard([Markup.button.webApp(buttonText, webAppUrl)]),
      );
    } catch (err) {
      this.logger.error(`Xabar yuborib bo'lmadi (telegramId=${telegramId}): ${err.message}`);
    }
  }
}
