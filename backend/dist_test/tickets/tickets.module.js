"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ticket_entity_1 = require("./entities/ticket.entity");
const tickets_service_1 = require("./tickets.service");
const tickets_controller_1 = require("./tickets.controller");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const categories_module_1 = require("../categories/categories.module");
const bot_module_1 = require("../bot/bot.module");
const users_module_1 = require("../users/users.module");
let TicketsModule = class TicketsModule {
};
exports.TicketsModule = TicketsModule;
exports.TicketsModule = TicketsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ticket_entity_1.Ticket]),
            auth_module_1.AuthModule,
            organizations_module_1.OrganizationsModule,
            categories_module_1.CategoriesModule,
            bot_module_1.BotModule,
            users_module_1.UsersModule,
        ],
        providers: [tickets_service_1.TicketsService],
        controllers: [tickets_controller_1.TicketsController],
        exports: [tickets_service_1.TicketsService],
    })
], TicketsModule);
//# sourceMappingURL=tickets.module.js.map