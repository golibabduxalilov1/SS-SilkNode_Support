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
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const messages_service_1 = require("./messages.service");
const create_message_dto_1 = require("./dto/create-message.dto");
const telegram_auth_guard_1 = require("../auth/guards/telegram-auth.guard");
const user_eligibility_guard_1 = require("../auth/guards/user-eligibility.guard");
const admin_jwt_guard_1 = require("../auth/guards/admin-jwt.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
const notify_user_service_1 = require("../bot/notify-user.service");
let MessagesController = class MessagesController {
    constructor(messagesService, notifyUserService) {
        this.messagesService = messagesService;
        this.notifyUserService = notifyUserService;
    }
    async findMine(ticketId, user) {
        await this.assertOwnsTicket(ticketId, user.id);
        const messages = await this.messagesService.findByTicket(ticketId);
        return { success: true, data: messages };
    }
    async createMine(ticketId, dto, user) {
        await this.assertOwnsTicket(ticketId, user.id);
        const message = await this.messagesService.create(ticketId, user.id, dto.text);
        return { success: true, data: message };
    }
    async findForAdmin(ticketId) {
        const messages = await this.messagesService.findByTicket(ticketId);
        return { success: true, data: messages };
    }
    async createForAdmin(ticketId, dto, admin) {
        const message = await this.messagesService.create(ticketId, admin.id, dto.text);
        const ticket = await this.messagesService.findTicketForNotification(ticketId);
        if (ticket) {
            await this.notifyUserService.notifyNewMessage(ticket, dto.text);
        }
        return { success: true, data: message };
    }
    async assertOwnsTicket(ticketId, userId) {
        const ownerId = await this.messagesService.findTicketOwnerId(ticketId);
        if (ownerId !== userId) {
            throw new common_1.ForbiddenException("Bu murojaatga kirish huquqingiz yo'q.");
        }
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Get)('tickets/:ticketId/messages'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "findMine", null);
__decorate([
    (0, common_1.Post)('tickets/:ticketId/messages'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_message_dto_1.CreateMessageDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "createMine", null);
__decorate([
    (0, common_1.Get)('admin/tickets/:ticketId/messages'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "findForAdmin", null);
__decorate([
    (0, common_1.Post)('admin/tickets/:ticketId/messages'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_message_dto_1.CreateMessageDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "createForAdmin", null);
exports.MessagesController = MessagesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [messages_service_1.MessagesService,
        notify_user_service_1.NotifyUserService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map