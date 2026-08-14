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
exports.User = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../organizations/entities/organization.entity");
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["ADMIN"] = "admin";
    UserRole["SUPERADMIN"] = "superadmin";
})(UserRole || (exports.UserRole = UserRole = {}));
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_users_telegram_id', { unique: true }),
    (0, typeorm_1.Column)({ name: 'telegram_id', type: 'bigint', unique: true, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "telegramId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "fullname", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: UserRole, default: UserRole.USER }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_started', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isStarted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_phone_verified', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isPhoneVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_verified_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "phoneVerifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'admin_login', type: 'varchar', length: 255, nullable: true, unique: true }),
    __metadata("design:type", Object)
], User.prototype, "adminLogin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.users, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'organization_id' }),
    __metadata("design:type", Object)
], User.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'organization_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)('idx_users_verification', ['isStarted', 'isPhoneVerified'])
], User);
//# sourceMappingURL=user.entity.js.map