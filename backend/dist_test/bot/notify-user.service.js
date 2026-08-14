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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifyUserService = void 0;
const common_1 = require("@nestjs/common");
const bot_service_1 = require("./bot.service");
let NotifyUserService = class NotifyUserService {
    constructor(botService) {
        this.botService = botService;
    }
    async notifyNewMessage(ticket, messageText) {
        if (!ticket.createdBy?.telegramId)
            return;
        const preview = messageText.length > 200 ? `${messageText.slice(0, 200)}…` : messageText;
        const text = `💬 Murojaatingizga javob keldi #${ticket.number}\n` +
            `Mavzu: ${ticket.title}\n\n` +
            `${preview}`;
        const miniAppUrl = process.env.MINI_APP_URL || '';
        const ticketUrl = miniAppUrl ? `${miniAppUrl}?ticketId=${ticket.id}` : miniAppUrl;
        await this.botService.sendMessageWithWebAppButton(ticket.createdBy.telegramId, text, 'Murojaatni ochish', ticketUrl);
    }
};
exports.NotifyUserService = NotifyUserService;
exports.NotifyUserService = NotifyUserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bot_service_1.BotService])
], NotifyUserService);
//# sourceMappingURL=notify-user.service.js.map