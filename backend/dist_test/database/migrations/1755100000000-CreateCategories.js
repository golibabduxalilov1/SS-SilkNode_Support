"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCategories1755100000000 = void 0;
class CreateCategories1755100000000 {
    constructor() {
        this.name = 'CreateCategories1755100000000';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tickets_category_id";

      ALTER TABLE "tickets"
        DROP COLUMN "category_id";

      DROP TABLE IF EXISTS "categories";
    `);
    }
}
exports.CreateCategories1755100000000 = CreateCategories1755100000000;
//# sourceMappingURL=1755100000000-CreateCategories.js.map