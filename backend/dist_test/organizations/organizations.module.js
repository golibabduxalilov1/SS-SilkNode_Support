"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const organization_entity_1 = require("./entities/organization.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const user_entity_1 = require("../users/entities/user.entity");
const organizations_service_1 = require("./organizations.service");
const organizations_controller_1 = require("./organizations.controller");
const auth_module_1 = require("../auth/auth.module");
const users_module_1 = require("../users/users.module");
let OrganizationsModule = class OrganizationsModule {
};
exports.OrganizationsModule = OrganizationsModule;
exports.OrganizationsModule = OrganizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([organization_entity_1.Organization, ticket_entity_1.Ticket, user_entity_1.User]), auth_module_1.AuthModule, users_module_1.UsersModule],
        providers: [organizations_service_1.OrganizationsService],
        controllers: [organizations_controller_1.OrganizationsController, organizations_controller_1.PublicOrganizationsController],
        exports: [organizations_service_1.OrganizationsService],
    })
], OrganizationsModule);
//# sourceMappingURL=organizations.module.js.map