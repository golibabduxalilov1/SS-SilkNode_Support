import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Yo'nalish" / "Mahsulot/tizim" (categories) — bir xil nomli yozuvlar qayta-qayta qo'shilib
 * ketgan (murojaatda "boshqa" nom kiritilganda har safar yangi kategoriya yaratilgan).
 *
 * 1) Nomi (registr va chetdagi bo'sh joylarga e'tiborsiz) bir xil yozuvlardan eng kichik id
 *    saqlanadi; dublikatlarga bog'langan murojaatlar shu yozuvga ko'chiriladi (murojaat
 *    yo'qolmaydi); dublikatlar o'chiriladi.
 * 2) Bundan keyin takrorlanishning oldini olish uchun unique indeks qo'yiladi.
 */
export class DedupeCategoriesUniqueName1757000000000 implements MigrationInterface {
  name = 'DedupeCategoriesUniqueName1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE "category_dedupe_map" ON COMMIT DROP AS
        SELECT "id" AS "dup_id",
               MIN("id") OVER (PARTITION BY lower(btrim("name"))) AS "keep_id"
        FROM "categories";

      DELETE FROM "category_dedupe_map" WHERE "dup_id" = "keep_id";

      UPDATE "tickets" t
        SET "category_id" = m."keep_id"
        FROM "category_dedupe_map" m
        WHERE t."category_id" = m."dup_id";

      DELETE FROM "categories" c
        USING "category_dedupe_map" m
        WHERE c."id" = m."dup_id";

      CREATE UNIQUE INDEX "uq_categories_name_lower" ON "categories" (lower(btrim("name")));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // O'chirilgan dublikatlarni qayta tiklab bo'lmaydi — faqat indeks olib tashlanadi.
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_categories_name_lower";`);
  }
}
