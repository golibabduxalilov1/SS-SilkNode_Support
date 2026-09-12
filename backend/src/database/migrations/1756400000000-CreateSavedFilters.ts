import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T13 — murojaatlar jadvalidagi filtr kombinatsiyasini nom bilan saqlash uchun. Shaxsiy
 * (user_id bo'yicha) — bu bosqichda jamoaga umumiy emas. filter_json — TicketFilters'ning
 * to'liq holati (frontendda erkin shaklda saqlanadi/o'qiladi).
 */
export class CreateSavedFilters1756400000000 implements MigrationInterface {
  name = 'CreateSavedFilters1756400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "saved_filters" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(80) NOT NULL,
        "filter_json" JSONB NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_saved_filters_user_id" ON "saved_filters" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "saved_filters";
    `);
  }
}
