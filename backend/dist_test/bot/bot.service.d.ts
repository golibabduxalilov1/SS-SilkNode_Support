import { OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';
export declare class BotService implements OnModuleDestroy {
    private readonly logger;
    readonly bot: Telegraf;
    constructor();
    onModuleDestroy(): void;
    sendMessage(telegramId: string, text: string): Promise<void>;
    sendDocument(telegramId: string, filePath: string, filename: string): Promise<void>;
    sendMessageWithWebAppButton(telegramId: string, text: string, buttonText: string, webAppUrl: string): Promise<void>;
}
