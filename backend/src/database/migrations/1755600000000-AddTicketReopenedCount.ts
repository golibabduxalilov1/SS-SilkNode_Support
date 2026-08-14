import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dashboard'da "qayta ochilgan (reopened) murojaatlar foizi" ko'rsatkichi uchun —
 * ticket closed/resolved holatidan orqaga qaytganda oshadigan hisoblagich.
 */
export class AddTicketReopenedCount1755600000000 implements MigrationInterface {
  name = 'AddTicketReopenedCount1755600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "reopened_count" INTEGER NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "reopened_count";
    `);
  }
}
