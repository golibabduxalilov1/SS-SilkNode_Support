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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const organization_entity_1 = require("./entities/organization.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const user_entity_1 = require("../users/entities/user.entity");
let OrganizationsService = class OrganizationsService {
    constructor(organizationsRepository, ticketsRepository, usersRepository) {
        this.organizationsRepository = organizationsRepository;
        this.ticketsRepository = ticketsRepository;
        this.usersRepository = usersRepository;
    }
    findAll() {
        return this.organizationsRepository.find({ order: { name: 'ASC' } });
    }
    findAllActive() {
        return this.organizationsRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
    findById(id) {
        return this.organizationsRepository.findOne({ where: { id } });
    }
    create(name) {
        return this.organizationsRepository.save(this.organizationsRepository.create({ name }));
    }
    async update(id, data) {
        const organization = await this.findById(id);
        if (!organization)
            throw new common_1.NotFoundException('Tashkilot topilmadi.');
        if (data.name !== undefined)
            organization.name = data.name;
        if (data.isActive !== undefined)
            organization.isActive = data.isActive;
        return this.organizationsRepository.save(organization);
    }
    async remove(id) {
        const organization = await this.findById(id);
        if (!organization)
            throw new common_1.NotFoundException('Tashkilot topilmadi.');
        const [ticketCount, userCount] = await Promise.all([
            this.ticketsRepository.count({ where: { organizationId: id } }),
            this.usersRepository.count({ where: { organizationId: id } }),
        ]);
        if (ticketCount > 0 || userCount > 0) {
            throw new common_1.ConflictException("Bu tashkilotga bog'liq murojaatlar yoki xodimlar mavjud, uni o'chirib bo'lmaydi.");
        }
        await this.organizationsRepository.remove(organization);
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(organization_entity_1.Organization)),
    __param(1, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map