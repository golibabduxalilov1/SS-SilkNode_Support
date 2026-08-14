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
exports.AttachmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const attachments_service_1 = require("./attachments.service");
const tickets_service_1 = require("../tickets/tickets.service");
const messages_service_1 = require("../messages/messages.service");
const notify_user_service_1 = require("../bot/notify-user.service");
const bot_service_1 = require("../bot/bot.service");
const telegram_auth_guard_1 = require("../auth/guards/telegram-auth.guard");
const user_eligibility_guard_1 = require("../auth/guards/user-eligibility.guard");
const admin_jwt_guard_1 = require("../auth/guards/admin-jwt.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
const storage = (0, multer_1.diskStorage)({
    destination: process.env.UPLOAD_DIR || 'uploads',
    filename: (_req, file, callback) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        callback(null, `${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
    },
});
let AttachmentsController = class AttachmentsController {
    constructor(attachmentsService, ticketsService, messagesService, notifyUserService, botService) {
        this.attachmentsService = attachmentsService;
        this.ticketsService = ticketsService;
        this.messagesService = messagesService;
        this.notifyUserService = notifyUserService;
        this.botService = botService;
    }
    async uploadMine(ticketId, file, user) {
        await this.ticketsService.findOneForUser(ticketId, user.id);
        if (!file)
            throw new common_1.BadRequestException('Fayl biriktirilmagan.');
        const message = await this.messagesService.create(ticketId, user.id, `📎 ${file.originalname}`);
        const attachment = await this.attachmentsService.create({
            ticketId,
            messageId: message.id,
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            sizeBytes: String(file.size),
        });
        return { success: true, data: attachment };
    }
    async uploadForAdmin(ticketId, file, admin) {
        const ticket = await this.ticketsService.findById(ticketId);
        if (!ticket)
            throw new common_1.BadRequestException('Murojaat topilmadi.');
        if (!file)
            throw new common_1.BadRequestException('Fayl biriktirilmagan.');
        const message = await this.messagesService.create(ticketId, admin.id, `📎 ${file.originalname}`);
        const attachment = await this.attachmentsService.create({
            ticketId,
            messageId: message.id,
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            sizeBytes: String(file.size),
        });
        const ticketForNotification = await this.messagesService.findTicketForNotification(ticketId);
        if (ticketForNotification) {
            await this.notifyUserService.notifyNewMessage(ticketForNotification, `📎 ${file.originalname}`);
        }
        return { success: true, data: attachment };
    }
    async findMine(ticketId, user) {
        await this.ticketsService.findOneForUser(ticketId, user.id);
        const attachments = await this.attachmentsService.findByTicket(ticketId);
        return { success: true, data: attachments };
    }
    async findForAdmin(ticketId) {
        const ticket = await this.ticketsService.findById(ticketId);
        if (!ticket)
            throw new common_1.BadRequestException('Murojaat topilmadi.');
        const attachments = await this.attachmentsService.findByTicket(ticketId);
        return { success: true, data: attachments };
    }
    async downloadMine(ticketId, attachmentId, user, res) {
        await this.ticketsService.findOneForUser(ticketId, user.id);
        await this.streamAttachment(ticketId, attachmentId, res);
    }
    async downloadForAdmin(ticketId, attachmentId, res) {
        const ticket = await this.ticketsService.findById(ticketId);
        if (!ticket)
            throw new common_1.BadRequestException('Murojaat topilmadi.');
        await this.streamAttachment(ticketId, attachmentId, res);
    }
    async deliverMine(ticketId, attachmentId, user) {
        await this.ticketsService.findOneForUser(ticketId, user.id);
        const attachment = await this.attachmentsService.findById(attachmentId);
        if (!attachment || attachment.ticketId !== ticketId) {
            throw new common_1.NotFoundException('Fayl topilmadi.');
        }
        if (!user.telegramId) {
            throw new common_1.BadRequestException('Telegram foydalanuvchi aniqlanmadi.');
        }
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const filePath = (0, path_1.join)(process.cwd(), uploadDir, (0, path_1.basename)(attachment.fileUrl));
        await this.botService.sendDocument(user.telegramId, filePath, attachment.fileName);
        return { success: true };
    }
    async streamAttachment(ticketId, attachmentId, res) {
        const attachment = await this.attachmentsService.findById(attachmentId);
        if (!attachment || attachment.ticketId !== ticketId) {
            throw new common_1.NotFoundException('Fayl topilmadi.');
        }
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const filePath = (0, path_1.join)(process.cwd(), uploadDir, (0, path_1.basename)(attachment.fileUrl));
        res.download(filePath, attachment.fileName, (err) => {
            if (err && !res.headersSent) {
                res.status(404).json({ success: false, error: { message: 'Fayl topilmadi.' } });
            }
        });
    }
};
exports.AttachmentsController = AttachmentsController;
__decorate([
    (0, common_1.Post)('tickets/:ticketId/attachments'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage })),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "uploadMine", null);
__decorate([
    (0, common_1.Post)('admin/tickets/:ticketId/attachments'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage })),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "uploadForAdmin", null);
__decorate([
    (0, common_1.Get)('tickets/:ticketId/attachments'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "findMine", null);
__decorate([
    (0, common_1.Get)('admin/tickets/:ticketId/attachments'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "findForAdmin", null);
__decorate([
    (0, common_1.Get)('tickets/:ticketId/attachments/:attachmentId/download'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "downloadMine", null);
__decorate([
    (0, common_1.Get)('admin/tickets/:ticketId/attachments/:attachmentId/download'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "downloadForAdmin", null);
__decorate([
    (0, common_1.Post)('tickets/:ticketId/attachments/:attachmentId/deliver'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "deliverMine", null);
exports.AttachmentsController = AttachmentsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService,
        tickets_service_1.TicketsService,
        messages_service_1.MessagesService,
        notify_user_service_1.NotifyUserService,
        bot_service_1.BotService])
], AttachmentsController);
//# sourceMappingURL=attachments.controller.js.map