import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T16 — kategoriyalarni ikki vizual klasterga ("Yo'nalish" / "Mahsulot/tizim") bo'lish
 * (minimal versiya; to'liq ierarxiya — parent_category_id — Phase 4'ga qoldirilgan).
 * Standart qiymat 'mahsulot' — mavjud 18 ta kategoriyani to'g'ri klasterga qo'lda
 * taqsimlash reliz oldidan alohida, bir martalik ma'lumot vazifasi sifatida amalga oshiriladi
 * (haqiqiy kategoriya nomlari ushbu muhitdan ko'rinmaydi).
 */
export class AddCategoryCluster1756600000000 implements MigrationInterface {
  name = 'AddCategoryCluster1756600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "categories_cluster_enum" AS ENUM ('yonalish', 'mahsulot');
      ALTER TABLE "categories"
        ADD COLUMN "cluster" "categories_cluster_enum" NOT NULL DEFAULT 'mahsulot';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories" DROP COLUMN "cluster";
      DROP TYPE IF EXISTS "categories_cluster_enum";
    `);
  }
}
