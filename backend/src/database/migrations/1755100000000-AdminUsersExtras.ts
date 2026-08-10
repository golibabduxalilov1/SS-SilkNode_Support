import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Web Admin Panel — Xodimlar (admin/superadmin) boshqaruvi:
 * - users.telegram_id endi ixtiyoriy (admin panel orqali yaratilgan xodimlarda
 *   Telegram akkaunt bo'lmasligi mumkin).
 * - users.is_active — xodim hisobini o'chirmasdan vaqtincha bloklash uchun.
 */
export class AdminUsersExtras1755100000000 implements MigrationInterface {
  name = 'AdminUsersExtras1755100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "telegram_id" DROP NOT NULL;

      ALTER TABLE "users"
        ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "is_active";

      ALTER TABLE "users"
        ALTER COLUMN "telegram_id" SET NOT NULL;
    `);
  }
}
