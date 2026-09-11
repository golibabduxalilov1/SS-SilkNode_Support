import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ТЗ bo'lim 7: "Yopilish vaqti" murojaat kelib tushgan (created_at) vaqtdan emas, xodim ishni
 * boshlagan (birinchi marta 'in_progress'ga o'tgan) vaqtdan hisoblanishi kerak. Buni har safar
 * audit_logs'dan (jsonb, indekslanmagan metadata->>'to') qidirish dashboard statistikasi har
 * so'ralganda (barcha tiketlar xotiraga yuklanadi) N ta qo'shimcha so'rovga olib kelardi —
 * shuning uchun processing_started_at ticket jadvaliga bir marta yoziladigan ustun sifatida
 * qo'shiladi (statusni IN_PROGRESS'ga o'zgartirishda to'ldiriladi) va mavjud tiketlar uchun
 * audit tarixidan bir martalik backfill qilinadi. Audit tarixi bo'lmagan (legacy) tiketlarda
 * ustun null qoladi — hisoblashda created_at'ga fallback qilinadi (resolutionMinutes eski
 * ma'nosida, buzilmagan holda qoladi).
 */
export class AddTicketProcessingResolution1755900000000 implements MigrationInterface {
  name = 'AddTicketProcessingResolution1755900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "processing_started_at" TIMESTAMPTZ,
        ADD COLUMN "processing_resolution_minutes" INTEGER;

      -- Har bir ticket uchun birinchi marta 'in_progress'ga o'tgan audit yozuvi vaqti.
      UPDATE "tickets" t
        SET "processing_started_at" = first_in_progress."firstAt"
        FROM (
          SELECT "entity_id" AS ticket_id, MIN("created_at") AS "firstAt"
          FROM "audit_logs"
          WHERE "entity_type" = 'ticket'
            AND "action" = 'ticket_status_changed'
            AND "metadata" ->> 'to' = 'in_progress'
          GROUP BY "entity_id"
        ) first_in_progress
        WHERE first_in_progress.ticket_id = t.id::text;

      -- Allaqachon yopilgan/yechilgan tiketlar uchun sof qayta ishlash vaqtini bir martalik hisoblash
      -- (audit tarixi bo'lmasa created_at'ga fallback), diffMinutes() dagi MIN_RESOLUTION_MINUTES = 5 bilan mos.
      UPDATE "tickets"
        SET "processing_resolution_minutes" = GREATEST(
          5,
          ROUND(EXTRACT(EPOCH FROM ("closed_at" - COALESCE("processing_started_at", "created_at"))) / 60)::int
        )
        WHERE "closed_at" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "processing_started_at",
        DROP COLUMN IF EXISTS "processing_resolution_minutes";
    `);
  }
}
