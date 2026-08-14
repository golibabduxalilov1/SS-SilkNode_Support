"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const telegraf_1 = require("telegraf");
const fs = __importStar(require("fs"));
let BotService = BotService_1 = class BotService {
    constructor() {
        this.logger = new common_1.Logger(BotService_1.name);
        const token = process.env.BOT_TOKEN;
        if (!token) {
            this.logger.warn('BOT_TOKEN sozlanmagan — bot ishga tushirilmaydi.');
        }
        this.bot = new telegraf_1.Telegraf(token || 'disabled');
    }
    onModuleDestroy() {
        if (process.env.BOT_TOKEN)
            this.bot.stop('SIGTERM');
    }
    async sendMessage(telegramId, text) {
        if (!process.env.BOT_TOKEN)
            return;
        try {
            await this.bot.telegram.sendMessage(telegramId, text);
        }
        catch (err) {
            this.logger.error(`Xabar yuborib bo'lmadi (telegramId=${telegramId}): ${err.message}`);
        }
    }
    async sendDocument(telegramId, filePath, filename) {
        if (!process.env.BOT_TOKEN)
            return;
        try {
            await this.bot.telegram.sendDocument(telegramId, {
                source: fs.createReadStream(filePath),
                filename,
            });
        }
        catch (err) {
            this.logger.error(`Fayl yuborib bo'lmadi (telegramId=${telegramId}): ${err.message}`);
            throw err;
        }
    }
    async sendMessageWithWebAppButton(telegramId, text, buttonText, webAppUrl) {
        if (!process.env.BOT_TOKEN)
            return;
        try {
            await this.bot.telegram.sendMessage(telegramId, text, telegraf_1.Markup.inlineKeyboard([telegraf_1.Markup.button.webApp(buttonText, webAppUrl)]));
        }
        catch (err) {
            this.logger.error(`Xabar yuborib bo'lmadi (telegramId=${telegramId}): ${err.message}`);
        }
    }
};
exports.BotService = BotService;
exports.BotService = BotService = BotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], BotService);
//# sourceMappingURL=bot.service.js.map