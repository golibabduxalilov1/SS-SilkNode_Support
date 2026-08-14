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
exports.UserEligibilityGuard = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../../users/users.service");
const api_exception_1 = require("../../common/exceptions/api.exception");
let UserEligibilityGuard = class UserEligibilityGuard {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const telegramId = request.user?.telegramId;
        if (!telegramId) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Foydalanuvchi aniqlanmadi.');
        }
        const user = await this.usersService.findByTelegramId(telegramId);
        if (!user || !user.isStarted || !user.isPhoneVerified) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.FORBIDDEN, 'USER_NOT_VERIFIED', "Murojaat yuborish uchun avval Telegram botda '/start' bosing va telefon raqamingizni tasdiqlang.", {
                isStarted: user?.isStarted ?? false,
                isPhoneVerified: user?.isPhoneVerified ?? false,
            });
        }
        request.verifiedUser = user;
        return true;
    }
};
exports.UserEligibilityGuard = UserEligibilityGuard;
exports.UserEligibilityGuard = UserEligibilityGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UserEligibilityGuard);
//# sourceMappingURL=user-eligibility.guard.js.map