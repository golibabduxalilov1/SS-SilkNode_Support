import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T14 — Tashkilot/Kategoriya modaliga ixtiyoriy "Tavsif" va rangli teg qo'shish.
 * Ikkalasi ham nullable — mavjud yozuvlar bu maydonlarsiz ishlashda davom etadi.
 */
export class AddOrganizationCategoryExtraFields1756500000000 implements MigrationInterface {
  name = 'AddOrganizationCategoryExtraFields1756500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
        ADD COLUMN "description" TEXT,
        ADD COLUMN "color_tag" VARCHAR(7);
      ALTER TABLE "categories"
        ADD COLUMN "description" TEXT,
        ADD COLUMN "color_tag" VARCHAR(7);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations" DROP COLUMN "description", DROP COLUMN "color_tag";
      ALTER TABLE "categories" DROP COLUMN "description", DROP COLUMN "color_tag";
    `);
  }
}
