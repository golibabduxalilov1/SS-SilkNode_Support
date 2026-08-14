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
exports.NotifyAdminsService = void 0;
const common_1 = require("@nestjs/common");
const bot_service_1 = require("./bot.service");
const users_service_1 = require("../users/users.service");
let NotifyAdminsService = class NotifyAdminsService {
    constructor(botService, usersService) {
        this.botService = botService;
        this.usersService = usersService;
    }
    async notifyNewTicket(ticket, organizationName, categoryName) {
        const admins = await this.usersService.findAdmins();
        const text = `🔔 Yangi murojaat #${ticket.number}\n` +
            `Tashkilot: ${organizationName}\n` +
            `Mavzu: ${ticket.title}\n` +
            `Kategoriya: ${categoryName}\n` +
            `Muhimlik: ${ticket.priority}\n\n` +
            `Batafsil: Web Admin Panel orqali ko'ring.`;
        for (const admin of admins) {
            if (!admin.telegramId)
                continue;
            await this.botService.sendMessage(admin.telegramId, text);
        }
    }
};
exports.NotifyAdminsService = NotifyAdminsService;
exports.NotifyAdminsService = NotifyAdminsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bot_service_1.BotService,
        users_service_1.UsersService])
], NotifyAdminsService);
//# sourceMappingURL=notify-admins.service.js.map