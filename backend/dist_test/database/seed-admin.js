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
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const bcrypt = __importStar(require("bcrypt"));
const data_source_1 = require("./data-source");
const user_entity_1 = require("../users/entities/user.entity");
async function run() {
    const login = process.env.SUPERADMIN_LOGIN || 'superadmin';
    const password = process.env.SUPERADMIN_PASSWORD;
    const telegramId = process.env.SUPERADMIN_TELEGRAM_ID;
    if (!password) {
        throw new Error('.env faylida SUPERADMIN_PASSWORD ko\'rsatilmagan.');
    }
    if (!telegramId) {
        throw new Error('.env faylida SUPERADMIN_TELEGRAM_ID ko\'rsatilmagan. Botga /start bosib ' +
            'o\'z Telegram user_id\'ingizni bilib oling, so\'ng shu qiymatni kiriting.');
    }
    await data_source_1.AppDataSource.initialize();
    const repo = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const passwordHash = await bcrypt.hash(password, 10);
    let user = await repo.findOne({ where: { telegramId } });
    if (user) {
        user.role = user_entity_1.UserRole.SUPERADMIN;
        user.adminLogin = login;
        user.passwordHash = passwordHash;
    }
    else {
        user = repo.create({
            telegramId,
            role: user_entity_1.UserRole.SUPERADMIN,
            adminLogin: login,
            passwordHash,
            isStarted: false,
            isPhoneVerified: false,
        });
    }
    await repo.save(user);
    console.log(`Superadmin tayyor: login="${login}", telegramId=${telegramId}`);
    await data_source_1.AppDataSource.destroy();
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed-admin.js.map