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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const telegram_auth_guard_1 = require("./guards/telegram-auth.guard");
const admin_jwt_guard_1 = require("./guards/admin-jwt.guard");
const admin_login_dto_1 = require("./dto/admin-login.dto");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async getStatus(req) {
        const data = await this.authService.getStatus(req.user.telegramId);
        return { success: true, data };
    }
    async adminLogin(dto) {
        const result = await this.authService.adminLogin(dto.login, dto.password);
        return { success: true, data: result };
    }
    async me(req) {
        const { id, fullname, role } = req.user;
        return { success: true, data: { id, fullname, role } };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('auth/status'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('admin/auth/login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_login_dto_1.AdminLoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminLogin", null);
__decorate([
    (0, common_1.Get)('admin/auth/me'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map