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
exports.Ticket = exports.TicketStatus = exports.TicketPriority = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../organizations/entities/organization.entity");
const category_entity_1 = require("../../categories/entities/category.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const message_entity_1 = require("../../messages/entities/message.entity");
var TicketPriority;
(function (TicketPriority) {
    TicketPriority["LOW"] = "low";
    TicketPriority["MEDIUM"] = "medium";
    TicketPriority["HIGH"] = "high";
    TicketPriority["CRITICAL"] = "critical";
})(TicketPriority || (exports.TicketPriority = TicketPriority = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["NEW"] = "new";
    TicketStatus["IN_PROGRESS"] = "in_progress";
    TicketStatus["WAITING_USER"] = "waiting_user";
    TicketStatus["RESOLVED"] = "resolved";
    TicketStatus["CLOSED"] = "closed";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
let Ticket = class Ticket {
};
exports.Ticket = Ticket;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], Ticket.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 32, unique: true }),
    __metadata("design:type", String)
], Ticket.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Ticket.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Ticket.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.Category, (category) => category.tickets, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", Object)
], Ticket.prototype, "categoryEntity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], Ticket.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM }),
    __metadata("design:type", String)
], Ticket.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TicketStatus, default: TicketStatus.NEW }),
    __metadata("design:type", String)
], Ticket.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.tickets, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'organization_id' }),
    __metadata("design:type", Object)
], Ticket.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'organization_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], Ticket.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by_id' }),
    __metadata("design:type", user_entity_1.User)
], Ticket.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', type: 'bigint' }),
    __metadata("design:type", String)
], Ticket.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assigned_to_id' }),
    __metadata("design:type", Object)
], Ticket.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], Ticket.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (message) => message.ticket),
    __metadata("design:type", Array)
], Ticket.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Ticket.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolution_minutes', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Ticket.prototype, "resolutionMinutes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Ticket.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Ticket.prototype, "updatedAt", void 0);
exports.Ticket = Ticket = __decorate([
    (0, typeorm_1.Entity)('tickets')
], Ticket);
//# sourceMappingURL=ticket.entity.js.map