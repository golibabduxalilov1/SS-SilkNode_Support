"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BotUpdate_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotUpdate = void 0;
const common_1 = require("@nestjs/common");
const telegraf_1 = require("telegraf");
const bot_service_1 = require("./bot.service");
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/entities/user.entity");
const phone_util_1 = require("./utils/phone.util");
const env_validation_1 = require("../config/env.validation");
let BotUpdate = BotUpdate_1 = class BotUpdate {
    constructor(botService, usersService) {
        this.botService = botService;
        this.usersService = usersService;
        this.logger = new common_1.Logger(BotUpdate_1.name);
    }
    async onModuleInit() {
        const miniAppUrl = process.env.MINI_APP_URL || '';
        const { bot } = this.botService;
        if (!(0, env_validation_1.isValidMiniAppUrl)(miniAppUrl)) {
            const message = "MINI_APP_URL noto'g'ri sozlangan, Mini App tugmasi ishlamaydi " +
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
            const { user, created } = await this.usersService.findOrCreateByTelegramId(String(telegramId), { fullname, username, isStarted: true, startedAt: new Date() });
            if (!created && !user.isStarted) {
                await this.usersService.markStarted(String(telegramId));
            }
            if (user.role === user_entity_1.UserRole.ADMIN || user.role === user_entity_1.UserRole.SUPERADMIN) {
                return ctx.reply('Xush kelibsiz! Siz administrator sifatida ro\'yxatdan o\'tgansiz. ' +
                    'Yangi murojaatlar haqida shu chatga bildirishnoma kelib turadi. ' +
                    "Boshqaruv uchun Web Admin Panel'dan foydalaning.");
            }
            if (!user.isPhoneVerified) {
                return ctx.reply('Xush kelibsiz! Davom etish uchun telefon raqamingizni tasdiqlang.', telegraf_1.Markup.keyboard([telegraf_1.Markup.button.contactRequest('📱 Raqamni yuborish')])
                    .resize()
                    .oneTime());
            }
            return ctx.reply('Service Desk tizimiga xush kelibsiz.', telegraf_1.Markup.inlineKeyboard([telegraf_1.Markup.button.webApp("Service Desk'ni ochish", miniAppUrl)]));
        });
        bot.on('contact', async (ctx) => {
            const contact = ctx.message
                .contact;
            if (contact.user_id !== ctx.from.id) {
                return ctx.reply("Iltimos, faqat o'zingizning raqamingizni yuboring.");
            }
            const normalizedPhone = (0, phone_util_1.normalizeToE164)(contact.phone_number);
            await this.usersService.verifyPhone(String(ctx.from.id), normalizedPhone);
            return ctx.reply('Raqamingiz tasdiqlandi. Endi tizimdan foydalanishingiz mumkin.', telegraf_1.Markup.inlineKeyboard([telegraf_1.Markup.button.webApp("Service Desk'ni ochish", miniAppUrl)]));
        });
        if (process.env.BOT_TOKEN) {
            bot.launch().catch((err) => this.logger.error(`Bot launch xatosi: ${err.message}`));
            this.logger.log('Telegram bot ishga tushdi (long polling).');
        }
    }
};
exports.BotUpdate = BotUpdate;
exports.BotUpdate = BotUpdate = BotUpdate_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bot_service_1.BotService,
        users_service_1.UsersService])
], BotUpdate);
//# sourceMappingURL=bot.update.js.map