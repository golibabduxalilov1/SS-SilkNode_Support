"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const users_module_1 = require("../users/users.module");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const user_eligibility_guard_1 = require("./guards/user-eligibility.guard");
const telegram_auth_guard_1 = require("./guards/telegram-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const admin_jwt_guard_1 = require("./guards/admin-jwt.guard");
const admin_roles_guard_1 = require("./guards/admin-roles.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                useFactory: () => ({
                    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
                    signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            user_eligibility_guard_1.UserEligibilityGuard,
            telegram_auth_guard_1.TelegramAuthGuard,
            roles_guard_1.RolesGuard,
            admin_jwt_guard_1.AdminJwtAuthGuard,
            admin_roles_guard_1.AdminRolesGuard,
        ],
        exports: [
            user_eligibility_guard_1.UserEligibilityGuard,
            telegram_auth_guard_1.TelegramAuthGuard,
            roles_guard_1.RolesGuard,
            admin_jwt_guard_1.AdminJwtAuthGuard,
            admin_roles_guard_1.AdminRolesGuard,
            jwt_1.JwtModule,
            passport_1.PassportModule,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map