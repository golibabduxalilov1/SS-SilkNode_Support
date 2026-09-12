import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Sayt qotib qolish" tahlili (2026-09-12): tickets.assigned_to_id, closed_at va created_at
 * ustunlari admin panel/dashboard so'rovlarida (filtrlash, ORDER BY, "hozirgi yuklama" hisobi)
 * tez-tez ishlatiladi, lekin indeks yo'q edi — jadval o'sgani sari sekin sequential scan'ga
 * olib kelardi. Faqat qo'shimcha indeks — mavjud ma'lumot/xatti-harakat o'zgarmaydi.
 */
export class AddTicketPerformanceIndexes1756700000000 implements MigrationInterface {
  name = 'AddTicketPerformanceIndexes1756700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tickets_assigned_to_id" ON "tickets"("assigned_to_id");
      CREATE INDEX IF NOT EXISTS "idx_tickets_closed_at" ON "tickets"("closed_at");
      CREATE INDEX IF NOT EXISTS "idx_tickets_created_at" ON "tickets"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tickets_assigned_to_id";
      DROP INDEX IF EXISTS "idx_tickets_closed_at";
      DROP INDEX IF EXISTS "idx_tickets_created_at";
    `);
  }
}
