"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
let UsersService = class UsersService {
    constructor(usersRepository, ticketsRepository) {
        this.usersRepository = usersRepository;
        this.ticketsRepository = ticketsRepository;
    }
    findByTelegramId(telegramId) {
        return this.usersRepository.findOne({ where: { telegramId } });
    }
    findByAdminLogin(adminLogin) {
        return this.usersRepository.findOne({ where: { adminLogin } });
    }
    async findOrCreateByTelegramId(telegramId, defaults) {
        const existing = await this.findByTelegramId(telegramId);
        if (existing) {
            return { user: existing, created: false };
        }
        const created = this.usersRepository.create({ telegramId, ...defaults });
        const user = await this.usersRepository.save(created);
        return { user, created: true };
    }
    async markStarted(telegramId) {
        const user = await this.findByTelegramId(telegramId);
        if (!user) {
            throw new Error(`Foydalanuvchi topilmadi: telegramId=${telegramId}`);
        }
        user.isStarted = true;
        user.startedAt = new Date();
        return this.usersRepository.save(user);
    }
    async verifyPhone(telegramId, phoneNumber) {
        const user = await this.findByTelegramId(telegramId);
        if (!user) {
            throw new Error(`Foydalanuvchi topilmadi: telegramId=${telegramId}`);
        }
        user.phoneNumber = phoneNumber;
        user.isPhoneVerified = true;
        user.phoneVerifiedAt = new Date();
        return this.usersRepository.save(user);
    }
    findAdmins() {
        return this.usersRepository.find({
            where: [{ role: user_entity_1.UserRole.ADMIN }, { role: user_entity_1.UserRole.SUPERADMIN }],
        });
    }
    findAllAdmins(organizationId) {
        return this.usersRepository.find({
            where: {
                role: (0, typeorm_2.In)([user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUPERADMIN]),
                ...(organizationId ? { organizationId } : {}),
            },
            relations: { organization: true },
            order: { createdAt: 'DESC' },
        });
    }
    findById(id) {
        return this.usersRepository.findOne({ where: { id }, relations: { organization: true } });
    }
    async assertSuperadminSlotAvailable(excludeUserId) {
        const existing = await this.usersRepository.findOne({
            where: { role: user_entity_1.UserRole.SUPERADMIN },
        });
        if (existing && existing.id !== excludeUserId) {
            throw new common_1.ConflictException("Loyihada faqat bitta superadmin bo'lishi mumkin.");
        }
    }
    async createAdmin(dto) {
        const existing = await this.findByAdminLogin(dto.adminLogin);
        if (existing) {
            throw new common_1.ConflictException("Bu login band, boshqasini tanlang.");
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        let telegramOwner = null;
        if (dto.telegramId) {
            telegramOwner = await this.findByTelegramId(dto.telegramId);
            if (telegramOwner?.adminLogin) {
                throw new common_1.ConflictException('Bu Telegram ID allaqachon boshqa xodimga biriktirilgan.');
            }
        }
        if (dto.role === user_entity_1.UserRole.SUPERADMIN) {
            await this.assertSuperadminSlotAvailable(telegramOwner?.id);
        }
        if (telegramOwner) {
            telegramOwner.fullname = dto.fullname;
            telegramOwner.adminLogin = dto.adminLogin;
            telegramOwner.passwordHash = passwordHash;
            telegramOwner.role = dto.role ?? user_entity_1.UserRole.ADMIN;
            telegramOwner.organizationId = dto.organizationId ?? null;
            telegramOwner.isActive = true;
            return this.usersRepository.save(telegramOwner);
        }
        const user = this.usersRepository.create({
            fullname: dto.fullname,
            adminLogin: dto.adminLogin,
            passwordHash,
            role: dto.role ?? user_entity_1.UserRole.ADMIN,
            organizationId: dto.organizationId ?? null,
            isActive: true,
            isStarted: false,
            isPhoneVerified: false,
            telegramId: dto.telegramId ?? null,
        });
        return this.usersRepository.save(user);
    }
    async updateAdmin(id, dto) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi.');
        }
        if (dto.fullname !== undefined)
            user.fullname = dto.fullname;
        if (dto.adminLogin !== undefined && dto.adminLogin !== user.adminLogin) {
            const existing = await this.findByAdminLogin(dto.adminLogin);
            if (existing && existing.id !== user.id) {
                throw new common_1.ConflictException('Bu login band, boshqasini tanlang.');
            }
            user.adminLogin = dto.adminLogin;
        }
        if (dto.role !== undefined) {
            if (dto.role === user_entity_1.UserRole.SUPERADMIN) {
                await this.assertSuperadminSlotAvailable(user.id);
            }
            user.role = dto.role;
        }
        if (dto.organizationId !== undefined)
            user.organizationId = dto.organizationId;
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        if (dto.password)
            user.passwordHash = await bcrypt.hash(dto.password, 10);
        if (dto.telegramId !== undefined) {
            if (!dto.telegramId) {
                user.telegramId = null;
            }
            else {
                const owner = await this.findByTelegramId(dto.telegramId);
                if (owner && owner.id !== user.id) {
                    throw new common_1.ConflictException('Bu Telegram ID allaqachon boshqa xodimga biriktirilgan.');
                }
                user.telegramId = dto.telegramId;
            }
        }
        return this.usersRepository.save(user);
    }
    async deactivateAdmin(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi.');
        }
        user.isActive = false;
        return this.usersRepository.save(user);
    }
    save(user) {
        return this.usersRepository.save(user);
    }
    async remove(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi.');
        }
        const ticketCount = await this.ticketsRepository.count({
            where: [{ createdById: id }, { assignedToId: id }],
        });
        if (ticketCount > 0) {
            throw new common_1.ConflictException("Bu xodimga bog'liq murojaatlar mavjud, uni o'chirib bo'lmaydi.");
        }
        await this.usersRepository.remove(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map