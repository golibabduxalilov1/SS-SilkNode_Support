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
exports.PublicCategoriesController = exports.CategoriesController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const categories_service_1 = require("./categories.service");
const update_category_dto_1 = require("./dto/update-category.dto");
const admin_jwt_guard_1 = require("../auth/guards/admin-jwt.guard");
const telegram_auth_guard_1 = require("../auth/guards/telegram-auth.guard");
const user_eligibility_guard_1 = require("../auth/guards/user-eligibility.guard");
class CreateCategoryDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
let CategoriesController = class CategoriesController {
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
    }
    async findAll() {
        const categories = await this.categoriesService.findAll();
        return { success: true, data: categories };
    }
    async create(dto) {
        const category = await this.categoriesService.create(dto.name);
        return { success: true, data: category };
    }
    async update(id, dto) {
        const category = await this.categoriesService.update(id, dto);
        return { success: true, data: category };
    }
    async remove(id) {
        await this.categoriesService.remove(id);
        return { success: true };
    }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_category_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "remove", null);
exports.CategoriesController = CategoriesController = __decorate([
    (0, common_1.Controller)('admin/categories'),
    (0, common_1.UseGuards)(admin_jwt_guard_1.AdminJwtAuthGuard),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], CategoriesController);
let PublicCategoriesController = class PublicCategoriesController {
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
    }
    async findAllActive() {
        const categories = await this.categoriesService.findAllActive();
        return { success: true, data: categories };
    }
    async create(dto) {
        const category = await this.categoriesService.create(dto.name);
        return { success: true, data: category };
    }
};
exports.PublicCategoriesController = PublicCategoriesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicCategoriesController.prototype, "findAllActive", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard, user_eligibility_guard_1.UserEligibilityGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], PublicCategoriesController.prototype, "create", null);
exports.PublicCategoriesController = PublicCategoriesController = __decorate([
    (0, common_1.Controller)('categories'),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], PublicCategoriesController);
//# sourceMappingURL=categories.controller.js.map