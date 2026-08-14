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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("./entities/category.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
let CategoriesService = class CategoriesService {
    constructor(categoriesRepository, ticketsRepository) {
        this.categoriesRepository = categoriesRepository;
        this.ticketsRepository = ticketsRepository;
    }
    findAll() {
        return this.categoriesRepository.find({ order: { name: 'ASC' } });
    }
    findAllActive() {
        return this.categoriesRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
    findById(id) {
        return this.categoriesRepository.findOne({ where: { id } });
    }
    create(name) {
        return this.categoriesRepository.save(this.categoriesRepository.create({ name }));
    }
    async update(id, data) {
        const category = await this.findById(id);
        if (!category)
            throw new common_1.NotFoundException('Kategoriya topilmadi.');
        if (data.name !== undefined)
            category.name = data.name;
        if (data.isActive !== undefined)
            category.isActive = data.isActive;
        return this.categoriesRepository.save(category);
    }
    async remove(id) {
        const category = await this.findById(id);
        if (!category)
            throw new common_1.NotFoundException('Kategoriya topilmadi.');
        const ticketCount = await this.ticketsRepository.count({ where: { categoryId: id } });
        if (ticketCount > 0) {
            throw new common_1.ConflictException("Bu kategoriyaga bog'liq murojaatlar mavjud, uni o'chirib bo'lmaydi.");
        }
        await this.categoriesRepository.remove(category);
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(1, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map