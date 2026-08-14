import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Birinchi javob" (first response) vaqtini kuzatish funksiyasi loyihadan olib tashlandi.
 */
export class RemoveFirstResponseTracking1755500000000 implements MigrationInterface {
  name = 'RemoveFirstResponseTracking1755500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "first_response_at",
        DROP COLUMN IF EXISTS "first_response_minutes";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "first_response_at" TIMESTAMPTZ,
        ADD COLUMN "first_response_minutes" INTEGER;
    `);
  }
}
