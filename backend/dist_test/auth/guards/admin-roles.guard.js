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
exports.AdminRolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("../decorators/roles.decorator");
const api_exception_1 = require("../../common/exceptions/api.exception");
let AdminRolesGuard = class AdminRolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const allowedRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!allowedRoles || allowedRoles.length === 0)
            return true;
        const request = context.switchToHttp().getRequest();
        if (!allowedRoles.includes(request.user.role)) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.FORBIDDEN, 'ROLE_NOT_ALLOWED', "Ushbu amal uchun ruxsat yo'q.");
        }
        return true;
    }
};
exports.AdminRolesGuard = AdminRolesGuard;
exports.AdminRolesGuard = AdminRolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], AdminRolesGuard);
//# sourceMappingURL=admin-roles.guard.js.map