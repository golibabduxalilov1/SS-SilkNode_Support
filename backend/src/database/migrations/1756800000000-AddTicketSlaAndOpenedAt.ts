import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TZ "Ticket list: sorting and row highlighting" (v1.0, 15 Sep 2026) band 5-6 uchun:
 * - opened_at — "Unopened" (yarim qalin) belgisi, birinchi marta murojaat tafsiloti
 *   ochilganda bir marta yoziladi.
 * - sla_due_at / sla_total_minutes — jadvaldagi "SLA" ustuni va standart tartiblashning
 *   (band 2, ikkinchi kalit) SLA bo'yicha kechikkanlarni yuqoriga chiqarish qoidasi uchun.
 *   Hozircha ustuvorlikdan qat'iy nazar bitta SLA oynasi ishlatiladi — dashboard'dagi
 *   mavjud SLA_RESOLUTION_MINUTES (1440 daqiqa/24 soat) chegarasi bilan bir xil.
 */
export class AddTicketSlaAndOpenedAt1756800000000 implements MigrationInterface {
  name = 'AddTicketSlaAndOpenedAt1756800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN IF NOT EXISTS "opened_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "sla_due_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "sla_total_minutes" INTEGER;
    `);

    // Band 6: "eski murojaatlar release'dan keyin qalinlashib qolmasin" — status yangi
    // bo'lmagan barcha mavjud murojaatlar allaqachon ko'rilgan hisoblanadi.
    await queryRunner.query(`
      UPDATE "tickets"
      SET "opened_at" = "updated_at"
      WHERE "status" <> 'new' AND "opened_at" IS NULL;
    `);

    // Mavjud barcha murojaatlar uchun SLA oynasini created_at asosida to'ldirish
    // (yangi murojaatlar bundan buyon TicketsService.create/createLegacy'da o'rnatiladi).
    await queryRunner.query(`
      UPDATE "tickets"
      SET "sla_total_minutes" = 1440,
          "sla_due_at" = "created_at" + INTERVAL '1440 minutes'
      WHERE "sla_due_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tickets_default_sort"
        ON "tickets"("status", "sla_due_at", "priority", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tickets_default_sort";
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "opened_at",
        DROP COLUMN IF EXISTS "sla_due_at",
        DROP COLUMN IF EXISTS "sla_total_minutes";
    `);
  }
}
