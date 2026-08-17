import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin panelda qo'lda yaratilgan murojaatlar uchun haqiqiy murojaatchining
 * ismi/telefon raqamini yozib qo'yish imkoniyati (createdBy — buni kiritgan xodim, murojaatchi emas).
 */
export class AddTicketRequesterInfo1755800000000 implements MigrationInterface {
  name = 'AddTicketRequesterInfo1755800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "requester_name" VARCHAR(255),
        ADD COLUMN "requester_phone" VARCHAR(20);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "requester_name",
        DROP COLUMN IF EXISTS "requester_phone";
    `);
  }
}
