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
exports.TicketsController = void 0;
const common_1 = require("@nestjs/common");
const tickets_service_1 = require("./tickets.service");
const organizations_service_1 = require("../organizations/organizations.service");
const categories_service_1 = require("../categories/categories.service");
const notify_admins_service_1 = require("../bot/notify-admins.service");
const users_service_1 = require("../users/users.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const update_ticket_status_dto_1 = require("./dto/update-ticket-status.dto");
const assign_ticket_dto_1 = require("./dto/assign-ticket.dto");
const telegram_auth_guard_1 = require("../auth/guards/telegram-auth.guard");
const user_eligibility_guard_1 = require("../auth/guards/user-eligibility.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const admin_roles_guard_1 = require("../auth/guards/admin-roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const admin_jwt_guard_1 = require("../auth/guards/admin-jwt.guard");
const user_entity_1 = require("../users/entities/user.entity");
let TicketsController = class TicketsController {
    constructor(ticketsService, organizationsService, categoriesService, notifyAdminsService, usersService) {
        this.ticketsService = ticketsService;
        this.organizationsService = organizationsService;
        this.categoriesService = categoriesService;
        this.notifyAdminsService = notifyAdminsService;
        this.usersService = usersService;
    }
    async create(dto, user) {
        const ticket = await this.ticketsService.create(dto, user);
        const organization = ticket.organizationId
            ? await this.organizationsService.findById(ticket.organizationId)
            : null;
        const category = ticket.categoryId
            ? await this.categoriesService.findById(ticket.categoryId)
            : null;
        await this.notifyAdminsService.notifyNewTicket(ticket, organization?.name ?? '—', category?.name ?? '—');
        return { success: true, data: ticket };
    }
    async findMine(user) {
        const tickets = await this.ticketsService.findMine(user.id);
        return { success: true, data: tickets };
    }
    async findOneMine(id, user) {
        const ticket = await this.ticketsService.findOneForUser(id, user.id);
        return { success: true, data: ticket };
    }
    async findAllForAdmin() {
        const tickets = await this.ticketsService.findAllForAdmin();
        return { success: true, data: tickets };
    }
    async getDashboardStats(organizationId, assignedToId, categoryId, dateFrom, dateTo) {
        const stats = await this.ticketsService.getDashboardStats({
            organizationId: organizationId || undefined,
            assignedToId: assignedToId || undefined,
            categoryId: categoryId || undefined,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
        });
        return { success: true, data: stats };
    }
    async findAdmins() {
        const admins = await this.usersService.findAdmins();
        return { success: true, data: admins };
    }
    async findOneForAdmin(id) {
        const ticket = await this.ticketsService.findById(id);
        return { success: true, data: ticket };
    }
    async updateStatus(id, dto) {
        const ticket = await this.ticketsService.updateStatus(id, dto.status);
        return { success: true, data: ticket };
    }
    async assign(id, dto) {
        const ticket = await this.ticketsService.assign(id, dto.assignedToId || null);
        return { success: true, data: ticket };
    }
    async remove(id) {
        await this.ticketsService.remove(id);
        return { success: true };
    }
};
exports.TicketsController = TicketsController;
__decorate([
    (0, common_1.Post)('tickets'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.USER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ticket_dto_1.CreateTicketDto, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('tickets'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findMine", null);
__decorate([
    (0, common_1.Get)('tickets/:id'),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findOneMine", null);
__decorate([
    (0, common_1.Get)('admin/tickets'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findAllForAdmin", null);
__decorate([
    (0, common_1.Get)('admin/dashboard/stats'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Query)('organizationId')),
    __param(1, (0, common_1.Query)('assignedToId')),
    __param(2, (0, common_1.Query)('categoryId')),
    __param(3, (0, common_1.Query)('dateFrom')),
    __param(4, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('admin/users'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findAdmins", null);
__decorate([
    (0, common_1.Get)('admin/tickets/:id'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findOneForAdmin", null);
__decorate([
    (0, common_1.Patch)('admin/tickets/:id/status'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_ticket_status_dto_1.UpdateTicketStatusDto]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)('admin/tickets/:id/assign'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_ticket_dto_1.AssignTicketDto]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "assign", null);
__decorate([
    (0, common_1.Delete)('admin/tickets/:id'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard, admin_roles_guard_1.AdminRolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "remove", null);
exports.TicketsController = TicketsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService,
        organizations_service_1.OrganizationsService,
        categories_service_1.CategoriesService,
        notify_admins_service_1.NotifyAdminsService,
        users_service_1.UsersService])
], TicketsController);
//# sourceMappingURL=tickets.controller.js.map