import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Kategoriya" ni tickets ustidagi erkin matn ustunidan (category VARCHAR)
 * alohida boshqariladigan Categories bo'limiga aylantiradi (Organizations
 * bilan bir xil pattern).
 *
 * Backward-compatible: avval categories jadvali eski hardcoded qiymatlar
 * bilan seed qilinadi, so'ng tickets.category_id shu qiymatlar bo'yicha
 * to'ldiriladi — mavjud murojaatlar buzilmaydi. Eski "category" ustuni
 * saqlab qolinadi (down() uchun ham, tarixiy audit uchun ham).
 */
export class CreateCategories1755100000000 implements MigrationInterface {
  name = 'CreateCategories1755100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      INSERT INTO "categories" ("name")
        SELECT DISTINCT "category" FROM "tickets"
        UNION
        SELECT unnest(ARRAY[
          'ERP', 'CRM', 'Ishlab chiqarish', 'Veb-sayt', 'Telefoniya',
          'Elektron pochta', 'Tarmoq', 'Boshqa'
        ]);

      ALTER TABLE "tickets"
        ADD COLUMN "category_id" BIGINT REFERENCES "categories"("id");

      UPDATE "tickets" t
        SET "category_id" = c."id"
        FROM "categories" c
        WHERE c."name" = t."category" AND t."category_id" IS NULL;

      CREATE INDEX "idx_tickets_category_id" ON "tickets"("category_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tickets_category_id";

      ALTER TABLE "tickets"
        DROP COLUMN "category_id";

      DROP TABLE IF EXISTS "categories";
    `);
  }
}
