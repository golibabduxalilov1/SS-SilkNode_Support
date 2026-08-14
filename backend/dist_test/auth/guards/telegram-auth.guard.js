"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const api_exception_1 = require("../../common/exceptions/api.exception");
const telegram_init_data_util_1 = require("../utils/telegram-init-data.util");
const common_2 = require("@nestjs/common");
let TelegramAuthGuard = class TelegramAuthGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const initData = request.header('X-Telegram-Init-Data');
        const botToken = process.env.BOT_TOKEN;
        if (!initData) {
            throw new api_exception_1.ApiException(common_2.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Foydalanuvchi aniqlanmadi.');
        }
        const parsed = (0, telegram_init_data_util_1.validateTelegramInitData)(initData, botToken || '');
        if (!parsed) {
            throw new api_exception_1.ApiException(common_2.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'initData muddati o\'tgan yoki noto\'g\'ri.');
        }
        const user = {
            telegramId: String(parsed.user.id),
            firstName: parsed.user.first_name,
            lastName: parsed.user.last_name,
            username: parsed.user.username,
        };
        request.user = user;
        return true;
    }
};
exports.TelegramAuthGuard = TelegramAuthGuard;
exports.TelegramAuthGuard = TelegramAuthGuard = __decorate([
    (0, common_1.Injectable)()
], TelegramAuthGuard);
//# sourceMappingURL=telegram-auth.guard.js.map