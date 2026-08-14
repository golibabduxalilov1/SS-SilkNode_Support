"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidMiniAppUrl = isValidMiniAppUrl;
exports.validateEnv = validateEnv;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('EnvValidation');
const PLACEHOLDER_MARKERS = [
    'example.com',
    'REPLACE_WITH',
    'change_me',
    'your_bot_username',
    'dev-secret-change-me',
];
function looksLikePlaceholder(value) {
    const lower = value.toLowerCase();
    return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}
function isValidMiniAppUrl(value) {
    const trimmed = (value || '').trim();
    if (!trimmed)
        return false;
    if (looksLikePlaceholder(trimmed))
        return false;
    return trimmed.startsWith('https://');
}
const RULES = [
    {
        key: 'BOT_TOKEN',
        required: true,
        extraCheck: (value) => {
            if (looksLikePlaceholder(value)) {
                return "BotFather tokeni bilan almashtirilmagan (hali placeholder qiymat)";
            }
            if (!/^\d+:[\w-]+$/.test(value)) {
                return "format noto'g'ri (kutilgan ko'rinish: 123456789:AA...)";
            }
            return null;
        },
    },
    {
        key: 'MINI_APP_URL',
        required: true,
        extraCheck: (value) => {
            if (looksLikePlaceholder(value)) {
                return "hali haqiqiy domen bilan almashtirilmagan (placeholder qiymat)";
            }
            if (!value.startsWith('https://')) {
                return ("HTTPS bilan boshlanishi SHART — Telegram Mini App tugmasi " +
                    "HTTP yoki localhost manzilni qabul qilmaydi va \"Webview crashed\" " +
                    "xatosi bilan yopiladi");
            }
            return null;
        },
    },
    { key: 'DB_HOST', required: true },
    { key: 'DB_PORT', required: true },
    { key: 'DB_USERNAME', required: true },
    { key: 'DB_PASSWORD', required: true },
    { key: 'DB_DATABASE', required: true },
    {
        key: 'JWT_SECRET',
        required: true,
        extraCheck: (value) => {
            if (looksLikePlaceholder(value)) {
                return "hali xavfsiz tasodifiy qiymat bilan almashtirilmagan (placeholder/standart qiymat)";
            }
            if (value.length < 16) {
                return 'juda qisqa (xavfsizlik uchun kamida 16 belgi tavsiya etiladi)';
            }
            return null;
        },
    },
];
function validateEnv(config) {
    const isProduction = config.NODE_ENV === 'production';
    const errors = [];
    for (const rule of RULES) {
        const raw = config[rule.key];
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (!value) {
            if (rule.required)
                errors.push(`${rule.key} — sozlanmagan (.env faylida yo'q yoki bo'sh)`);
            continue;
        }
        const extraError = rule.extraCheck?.(value);
        if (extraError)
            errors.push(`${rule.key} — ${extraError}`);
    }
    if (errors.length > 0) {
        const message = [
            'Muhit o\'zgaruvchilari (.env) sozlamasida xatolar topildi:',
            ...errors.map((e) => `  - ${e}`),
        ].join('\n');
        if (isProduction) {
            throw new Error(message);
        }
        logger.warn(`${message}\n(Development muhitida davom etilmoqda — production'da bular MAJBURIY.)`);
    }
    return config;
}
//# sourceMappingURL=env.validation.js.map