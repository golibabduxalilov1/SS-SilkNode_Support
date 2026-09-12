import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T04 — "Mijozga javob" / "Ichki eslatma" ajratish uchun messages.visibility ustuni.
 * Mavjud xabarlar 'public' bo'lib qoladi (default) — orqaga qarab moslik buzilmaydi.
 */
export class AddMessageVisibility1756200000000 implements MigrationInterface {
  name = 'AddMessageVisibility1756200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "messages_visibility_enum" AS ENUM ('public', 'internal');
      ALTER TABLE "messages"
        ADD COLUMN "visibility" "messages_visibility_enum" NOT NULL DEFAULT 'public';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages" DROP COLUMN "visibility";
      DROP TYPE IF EXISTS "messages_visibility_enum";
    `);
  }
}
