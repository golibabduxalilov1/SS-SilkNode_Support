import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Birinchi superadmin'ni yaratadi/yangilaydi, shunda Web Admin Panel'ga
 * kirish mumkin bo'ladi (bo'lim 5.3). Ishga tushirish:
 *   npm run seed:admin
 * .env dagi SUPERADMIN_LOGIN / SUPERADMIN_PASSWORD / SUPERADMIN_TELEGRAM_ID
 * qiymatlaridan foydalanadi.
 */
async function run() {
  const login = process.env.SUPERADMIN_LOGIN || 'superadmin';
  const password = process.env.SUPERADMIN_PASSWORD;
  const telegramId = process.env.SUPERADMIN_TELEGRAM_ID;

  if (!password) {
    throw new Error('.env faylida SUPERADMIN_PASSWORD ko\'rsatilmagan.');
  }
  if (!telegramId) {
    throw new Error(
      '.env faylida SUPERADMIN_TELEGRAM_ID ko\'rsatilmagan. Botga /start bosib ' +
        'o\'z Telegram user_id\'ingizni bilib oling, so\'ng shu qiymatni kiriting.',
    );
  }

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);

  const passwordHash = await bcrypt.hash(password, 10);
  let user = await repo.findOne({ where: { telegramId } });

  if (user) {
    user.role = UserRole.SUPERADMIN;
    user.adminLogin = login;
    user.passwordHash = passwordHash;
  } else {
    user = repo.create({
      telegramId,
      role: UserRole.SUPERADMIN,
      adminLogin: login,
      passwordHash,
      isStarted: false,
      isPhoneVerified: false,
    });
  }

  await repo.save(user);
  // eslint-disable-next-line no-console
  console.log(`Superadmin tayyor: login="${login}", telegramId=${telegramId}`);
  await AppDataSource.destroy();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
