# Silknode Support

"Silknode Support Texnik Yechim" hujjatiga asosan qurilgan to'liq loyiha: foydalanuvchini
tekshirish (TALAB 1), admin/superadmin uchun Mini App cheklovi (TALAB 2) va
Telegram user_id/telefon raqamini bazada saqlash (TALAB 3).

Stek: **NestJS + TypeORM + PostgreSQL** (backend/bot), **React + Vite** (Mini App va
Web Admin Panel — ikkita alohida frontend ilova, bo'lim 5.3).

## Papkalar

```
backend/       NestJS API + Telegram bot (Telegraf)
mini-app/      Telegram Mini App (oddiy foydalanuvchi uchun)
admin-panel/   Web Admin Panel (admin/superadmin uchun, login/parol bilan)
docker-compose.yml   Lokal PostgreSQL
```

> **Production'ga joylashtirish:** to'liq bosqichma-bosqich qo'llanma
> uchun [DEPLOY.md](./DEPLOY.md) ga qarang (PM2 + Nginx, domen/SSL
> sozlash, keyingi deploy'lar). Xususan `MINI_APP_URL` HTTPS bo'lmasa
> Telegram Mini App'da "Webview crashed" xatosi chiqadi — shuni oldini
> olish tafsilotlari ham o'sha faylda.

## 1. PostgreSQL'ni ishga tushirish

```bash
docker compose up -d
```

## 2. Backend

```bash
cd backend
cp .env.example .env
# .env faylida BOT_TOKEN (BotFather'dan) va MINI_APP_URL'ni to'ldiring
npm install
npm run migration:run
npm run start:dev
```

API manzili: `http://localhost:3000/api/v1`

### Superadmin yaratish (Web Admin Panel uchun)

1. Botga `/start` bosing, so'ng backend loglaridan yoki bazadan o'zingizning
   `telegram_id`'ingizni aniqlang.
2. `.env` faylida `SUPERADMIN_TELEGRAM_ID`, `SUPERADMIN_LOGIN`,
   `SUPERADMIN_PASSWORD` qiymatlarini kiriting.
3. Ishga tushiring:

```bash
npm run seed:admin
```

## 3. Telegram Mini App

```bash
cd mini-app
cp .env.example .env
npm install
npm run dev
```

BotFather'da Mini App URL'ini shu ilova manzili (yoki uning production
domeniga) o'rnating — `MINI_APP_URL` backend `.env`'idagi qiymat bilan bir xil
bo'lishi kerak.

## 4. Web Admin Panel

```bash
cd admin-panel
cp .env.example .env
npm install
npm run dev
```

`http://localhost:5174/login` — Mini App bilan hech qanday umumiy sessiya yoki
tokenga ega emas (bo'lim 5.3).

## Talablarning implementatsiya xaritasi

| Talab | Qayerda |
|---|---|
| TALAB 1 — foydalanuvchini tekshirish | `backend/src/bot/bot.update.ts` (/start, contact), `backend/src/auth/guards/telegram-auth.guard.ts`, `backend/src/auth/guards/user-eligibility.guard.ts`, `mini-app/src/pages/NewTicket` |
| TALAB 2 — admin/superadmin cheklovi | `mini-app/src/App.tsx` + `AdminNoticeScreen.tsx`, `backend/src/bot/notify-admins.service.ts`, `backend/src/auth/guards/roles.guard.ts`, `admin-panel/` (alohida ilova) |
| TALAB 3 — ma'lumotlarni saqlash | `backend/src/users/entities/user.entity.ts`, `backend/src/database/migrations/1754640000000-InitSchema.ts` |

## Rollout tartibi (hujjat bo'lim 9)

1. `npm run migration:run` — mavjud foydalanuvchilar uchun `is_started=false`,
   `is_phone_verified=false` standart qiymatlar bilan.
2. Bot handlerlarini (`/start`, contact) alohida muhitda sinab ko'ring.
3. `verifyUserEligibility` / `requireRole` guardlari — kodda allaqachon ulangan.
4. Mini App UI (tugma holati, admin ekrani) — rol asosida qo'lda test qiling.
5. Admin bildirishnoma xabarlari — tugmasiz format (`notify-admins.service.ts`).
6. To'liq regressiya — hujjat bo'lim 8 dagi QA checklist bo'yicha.

## Eslatma: doirasi

Ushbu loyiha "Silknode Support Texnik Yechim" hujjatidagi TALAB 1-3'ga to'liq
mos qurilgan. Fayl biriktirish (upload) HTTP endpoint'i, real-time chat
(WebSocket) va Dashboard'ning to'liq statistik ko'rinishlari asosiy TZ'da
tavsiflangan bo'lib, ushbu hujjat doirasidan tashqarida — `Attachment`
entity/service tayyor, lekin upload controller ataylab qo'shilmagan (bo'lim 9,
"MUHIM ESLATMA").
