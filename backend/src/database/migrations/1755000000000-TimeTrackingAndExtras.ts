import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit natijasida aniqlangan kamchiliklarni yopadi:
 * - Tickets: Time Tracking ustunlari (TZ bo'lim 8) + WAITING_USER status (bo'lim 7)
 * - Organizations: is_active
 * - Attachments: ticket_id orqali to'g'ridan-to'g'ri bog'lash (message_id endi ixtiyoriy)
 */
export class TimeTrackingAndExtras1755000000000 implements MigrationInterface {
  name = 'TimeTrackingAndExtras1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "tickets_status_enum" ADD VALUE IF NOT EXISTS 'waiting_user';
    `);

    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "first_response_at" TIMESTAMPTZ,
        ADD COLUMN "closed_at" TIMESTAMPTZ,
        ADD COLUMN "first_response_minutes" INTEGER,
        ADD COLUMN "resolution_minutes" INTEGER;

      ALTER TABLE "organizations"
        ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

      ALTER TABLE "attachments"
        ADD COLUMN "ticket_id" BIGINT REFERENCES "tickets"("id");

      UPDATE "attachments" a
        SET "ticket_id" = m."ticket_id"
        FROM "messages" m
        WHERE a."message_id" = m."id" AND a."ticket_id" IS NULL;

      ALTER TABLE "attachments"
        ALTER COLUMN "ticket_id" SET NOT NULL,
        ALTER COLUMN "message_id" DROP NOT NULL;

      CREATE INDEX "idx_attachments_ticket_id" ON "attachments"("ticket_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_attachments_ticket_id";

      ALTER TABLE "attachments"
        ALTER COLUMN "message_id" SET NOT NULL,
        DROP COLUMN "ticket_id";

      ALTER TABLE "organizations"
        DROP COLUMN "is_active";

      ALTER TABLE "tickets"
        DROP COLUMN "first_response_at",
        DROP COLUMN "closed_at",
        DROP COLUMN "first_response_minutes",
        DROP COLUMN "resolution_minutes";
    `);
    // Postgres 'waiting_user' enum qiymatini olib tashlashni qo'llab-quvvatlamaydi
    // (ALTER TYPE ... DROP VALUE mavjud emas) — down() da enum o'zgarishsiz qoladi.
  }
}
