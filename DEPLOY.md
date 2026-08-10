# Deploy qo'llanmasi (PM2 + Nginx, Docker'siz)

Bu qo'llanma Silknode Support'ni Ubuntu VPS serverga PM2 (process manager)
va Nginx (reverse proxy + static serve) yordamida, Docker'siz joylashtirish
uchun. Backend bitta Node.js jarayoni sifatida ishlaydi (REST API + Telegram
bot bir process ichida), Mini App va Admin Panel esa Nginx orqali xizmat
qiladigan static build'lar.

## 0. Talab qilinadigan narsalar

- Ubuntu 22.04/24.04 VPS, `sudo` huquqiga ega foydalanuvchi
- Node.js 20+, npm, PostgreSQL 16, Nginx, certbot (`python3-certbot-nginx`)
- Ikkita domen (yoki subdomen), DNS orqali server IP'siga yo'naltirilgan:
  - `app.domain.uz` — Mini App (+ backend API shu domendan `/api/` orqali)
  - `admin.domain.uz` — Web Admin Panel (+ backend API shu domendan ham)

DNS yo'naltirilganini oldindan tekshiring:

```bash
getent hosts app.domain.uz admin.domain.uz
```

## 1. Repo'ni clone qilish

```bash
cd /home/<user>
git clone https://github.com/golibabduxalilov1/SS-SilkNode_Support.git SilkNode-Support
cd SilkNode-Support
```

## 2. PostgreSQL: baza va foydalanuvchi

```bash
sudo -u postgres psql -c "CREATE USER silknode_support WITH PASSWORD '<xavfsiz-tasodifiy-parol>';"
sudo -u postgres psql -c "CREATE DATABASE silknode_support OWNER silknode_support;"
```

Parolni `openssl rand -base64 24` kabi buyruq bilan generatsiya qiling —
standart yoki taxmin qilinadigan qiymat qoldirmang.

## 3. Backend

```bash
cd backend
cp .env.example .env
```

`.env` faylini to'ldiring (har bir maydon uchun `.env.example`dagi
izohlarga qarang). **Eng muhimlari:**

- `MINI_APP_URL` — **HTTPS** va haqiqiy domen bo'lishi shart
  (`https://app.domain.uz`). Bu noto'g'ri bo'lsa, ilova production
  rejimida umuman ishga tushmaydi (bootstrap validatsiyasi to'xtatadi) —
  aks holda foydalanuvchida "Webview crashed" xatosi chiqadi.
- `BOT_TOKEN` — BotFather'dan.
- `JWT_SECRET` — `openssl rand -hex 32` bilan generatsiya qiling.
- `DB_*` — 2-bosqichda yaratilgan baza/foydalanuvchi.
- `NODE_ENV=production`

```bash
npm install
npm run build
npm run migration:run
npm run seed:admin   # SUPERADMIN_* to'ldirilgandan keyin, bir marta
```

PM2 orqali ishga tushirish:

```bash
npx pm2 start dist/main.js --name silknode-backend
npx pm2 save
npx pm2 startup   # ko'rsatilgan sudo buyrug'ini bajaring — server reboot'da avto-tiklanish uchun
```

## 4. Mini App

```bash
cd ../mini-app
cp .env.example .env
```

`.env`:
```
VITE_API_BASE_URL=https://app.domain.uz/api/v1
VITE_BOT_USERNAME=<bot_username, "@" belgisisiz>
```

```bash
npm install
npm run build
```

Natija: `mini-app/dist/` — Nginx shu papkani static serve qiladi.

## 5. Admin Panel

```bash
cd ../admin-panel
cp .env.example .env
```

`.env`:
```
VITE_API_BASE_URL=https://admin.domain.uz/api/v1
```

```bash
npm install
npm run build
```

Natija: `admin-panel/dist/`.

## 6. Nginx

Ikkita alohida config fayl yarating (`/etc/nginx/sites-available/`), har
birini symlink orqali `sites-enabled/`ga ulang.

`app.domain.uz`:

```nginx
server {
    listen 80;
    server_name app.domain.uz;
    client_max_body_size 25M;

    root /home/<user>/SilkNode-Support/mini-app/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`admin.domain.uz` — bir xil, faqat `server_name` va `root` (`admin-panel/dist`)
o'zgaradi.

Har bir faylni yozgandan keyin **majburiy**:

```bash
sudo nginx -t          # sintaksis xato bo'lsa reload qilmang
sudo systemctl reload nginx
```

## 7. SSL (certbot)

Faqat shu ikki domen uchun, aniq ko'rsatilgan holda:

```bash
sudo certbot --nginx -d app.domain.uz -d admin.domain.uz --redirect
```

Certbot nginx configlarni avtomatik yangilaydi va `ssl_certificate`
qatorlarini qo'shadi. Qayta tekshiring:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 8. Yakuniy tekshiruv

```bash
curl -I https://app.domain.uz/
curl -I https://admin.domain.uz/
curl -I https://app.domain.uz/api/v1/auth/status   # 401 kutiladi (token yo'q)
npx pm2 list                                        # silknode-backend: online
```

Botga Telegram'da `/start` yuboring — "Webview crashed" chiqmasligi va
Mini App tugmasi ochilishi kerak.

## 9. Keyingi deploy'lar (kod yangilanganda)

```bash
cd /home/<user>/SilkNode-Support
git pull origin main

# Migratsiya bo'lsa — oldin zaxira:
mkdir -p ~/silknode_backups
DB_PASS=$(grep '^DB_PASSWORD=' backend/.env | cut -d= -f2-)
PGPASSWORD="$DB_PASS" pg_dump -h localhost -U silknode_support -d silknode_support \
  -F c -f ~/silknode_backups/silknode_support_$(date +%Y%m%d-%H%M%S).dump

cd backend && npm install && npm run build && npm run migration:run
npx pm2 reload silknode-backend   # restart emas — uzilishsiz

cd ../mini-app && npm install && npm run build
cd ../admin-panel && npm install && npm run build
```

Frontend build'lar static fayl bo'lgani uchun ularni yangilash uchun nginx
reload shart emas — `dist/` mazmuni yangilangan zahoti ta'sir qiladi.

## Muammolarni bartaraf etish

**"Webview crashed" Telegram'da chiqmoqda** — deyarli har doim
`MINI_APP_URL` sababli:
- HTTPS emasmi (HTTP yoki `localhost`) — Telegram buni webview'da
  ochishni butunlay rad etadi.
- Hali `.env.example`dagi namunaviy qiymat (`example.com`) qolib
  ketganmi.
- `NODE_ENV=production` bo'lsa, backend bunday holatda umuman ishga
  tushmaydi va sabab `pm2 logs silknode-backend`da aniq yozilgan bo'ladi.

**Backend PM2'da "online" lekin portni tinglamayapti** — `pm2 logs
silknode-backend --lines 50` bilan tekshiring; odatda `onModuleInit`
ichidagi bloklovchi `await` yoki DI xatosi (masalan yangi controller
qo'shilganda tegishli modulga `UsersModule` import qilinmagani) sababli
bo'ladi.
