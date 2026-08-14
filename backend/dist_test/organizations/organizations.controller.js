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
exports.PublicOrganizationsController = exports.OrganizationsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const organizations_service_1 = require("./organizations.service");
const update_organization_dto_1 = require("./dto/update-organization.dto");
const admin_jwt_guard_1 = require("../auth/guards/admin-jwt.guard");
const telegram_auth_guard_1 = require("../auth/guards/telegram-auth.guard");
const user_eligibility_guard_1 = require("../auth/guards/user-eligibility.guard");
class CreateOrganizationDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOrganizationDto.prototype, "name", void 0);
let OrganizationsController = class OrganizationsController {
    constructor(organizationsService) {
        this.organizationsService = organizationsService;
    }
    async findAll() {
        const organizations = await this.organizationsService.findAll();
        return { success: true, data: organizations };
    }
    async create(dto) {
        const organization = await this.organizationsService.create(dto.name);
        return { success: true, data: organization };
    }
    async update(id, dto) {
        const organization = await this.organizationsService.update(id, dto);
        return { success: true, data: organization };
    }
    async remove(id) {
        await this.organizationsService.remove(id);
        return { success: true };
    }
};
exports.OrganizationsController = OrganizationsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateOrganizationDto]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_organization_dto_1.UpdateOrganizationDto]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "remove", null);
exports.OrganizationsController = OrganizationsController = __decorate([
    (0, common_1.Controller)('admin/organizations'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService])
], OrganizationsController);
let PublicOrganizationsController = class PublicOrganizationsController {
    constructor(organizationsService) {
        this.organizationsService = organizationsService;
    }
    async findAllActive() {
        const organizations = await this.organizationsService.findAllActive();
        return { success: true, data: organizations };
    }
    async create(dto) {
        const organization = await this.organizationsService.create(dto.name);
        return { success: true, data: organization };
    }
};
exports.PublicOrganizationsController = PublicOrganizationsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicOrganizationsController.prototype, "findAllActive", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateOrganizationDto]),
    __metadata("design:returntype", Promise)
], PublicOrganizationsController.prototype, "create", null);
exports.PublicOrganizationsController = PublicOrganizationsController = __decorate([
    (0, common_1.Controller)('organizations'),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService])
], PublicOrganizationsController);
//# sourceMappingURL=organizations.controller.js.map