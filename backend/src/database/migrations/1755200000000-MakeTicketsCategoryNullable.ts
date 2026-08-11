import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bug fix: "Yangi murojaat" har doim 500 bilan tushib qolardi, chunki
 * CreateCategories1755100000000 migratsiyasi eski "category" VARCHAR
 * ustunini (tarixiy audit uchun) NOT NULL holicha saqlab qoldi, lekin
 * Ticket entity/TicketsService bu ustunni endi umuman bilmaydi va
 * to'ldirmaydi — natijada har bir yangi INSERT
 * "null value in column category violates not-null constraint" bilan
 * QueryFailedError tashlar edi (HttpException emasligi sabab global
 * filtr buni ushlamay, frontend'ga generic "Xatolik yuz berdi" ketardi).
 *
 * category_id + categories jadvali hozir yagona haqiqiy manba, shuning
 * uchun eski "category" ustuni faqat tarixiy o'qish uchun nullable
 * qilinadi — o'chirilmaydi (eski yozuvlar va down() uchun saqlanadi).
 */
export class MakeTicketsCategoryNullable1755200000000 implements MigrationInterface {
  name = 'MakeTicketsCategoryNullable1755200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets" ALTER COLUMN "category" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tickets" SET "category" = '' WHERE "category" IS NULL;
      ALTER TABLE "tickets" ALTER COLUMN "category" SET NOT NULL;
    `);
  }
}
