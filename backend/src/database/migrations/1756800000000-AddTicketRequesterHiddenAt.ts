import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Murojaatchilar" sahifasida superadmin murojaatchini o'chirganda tickets butunlay
 * o'chirilmasligi, faqat murojaatchilar ro'yxatidan yashirilishi uchun (requesters.service).
 */
export class AddTicketRequesterHiddenAt1756800000000 implements MigrationInterface {
  name = 'AddTicketRequesterHiddenAt1756800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "requester_hidden_at" TIMESTAMPTZ NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "requester_hidden_at";
    `);
  }
}
