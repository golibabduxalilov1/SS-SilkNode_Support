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
exports.Attachment = void 0;
const typeorm_1 = require("typeorm");
const message_entity_1 = require("../../messages/entities/message.entity");
const ticket_entity_1 = require("../../tickets/entities/ticket.entity");
let Attachment = class Attachment {
};
exports.Attachment = Attachment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], Attachment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ticket_entity_1.Ticket, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'ticket_id' }),
    __metadata("design:type", ticket_entity_1.Ticket)
], Attachment.prototype, "ticket", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ticket_id', type: 'bigint' }),
    __metadata("design:type", String)
], Attachment.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => message_entity_1.Message, (message) => message.attachments, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'message_id' }),
    __metadata("design:type", Object)
], Attachment.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'message_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], Attachment.prototype, "messageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_name', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Attachment.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'varchar', length: 1024 }),
    __metadata("design:type", String)
], Attachment.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], Attachment.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'size_bytes', type: 'bigint' }),
    __metadata("design:type", String)
], Attachment.prototype, "sizeBytes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Attachment.prototype, "createdAt", void 0);
exports.Attachment = Attachment = __decorate([
    (0, typeorm_1.Entity)('attachments')
], Attachment);
//# sourceMappingURL=attachment.entity.js.map