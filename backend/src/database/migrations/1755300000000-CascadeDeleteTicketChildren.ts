import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bug fix: Admin panel'da "Murojaatni o'chirish" (DELETE /admin/tickets/:id)
 * har doim 500 bilan tushib qolardi, chunki messages.ticket_id va
 * attachments.ticket_id/message_id FK'lari ON DELETE cheklovisiz (default
 * NO ACTION) edi — TicketsService.remove() shunchaki ticket qatorini
 * o'chirishga urinar, Postgres esa bog'liq messages/attachments mavjud
 * bo'lsa buni rad etardi (QueryFailedError, "violates foreign key
 * constraint messages_ticket_id_fkey").
 *
 * Murojaat o'chirilganda unga tegishli xabarlar va fayllar ham ma'noga
 * ega emas, shuning uchun ON DELETE CASCADE eng to'g'ri yechim.
 */
export class CascadeDeleteTicketChildren1755300000000 implements MigrationInterface {
  name = 'CascadeDeleteTicketChildren1755300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages" DROP CONSTRAINT "messages_ticket_id_fkey";
      ALTER TABLE "messages"
        ADD CONSTRAINT "messages_ticket_id_fkey"
        FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE;

      ALTER TABLE "attachments" DROP CONSTRAINT "attachments_ticket_id_fkey";
      ALTER TABLE "attachments"
        ADD CONSTRAINT "attachments_ticket_id_fkey"
        FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE;

      ALTER TABLE "attachments" DROP CONSTRAINT "attachments_message_id_fkey";
      ALTER TABLE "attachments"
        ADD CONSTRAINT "attachments_message_id_fkey"
        FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attachments" DROP CONSTRAINT "attachments_message_id_fkey";
      ALTER TABLE "attachments"
        ADD CONSTRAINT "attachments_message_id_fkey"
        FOREIGN KEY ("message_id") REFERENCES "messages"("id");

      ALTER TABLE "attachments" DROP CONSTRAINT "attachments_ticket_id_fkey";
      ALTER TABLE "attachments"
        ADD CONSTRAINT "attachments_ticket_id_fkey"
        FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id");

      ALTER TABLE "messages" DROP CONSTRAINT "messages_ticket_id_fkey";
      ALTER TABLE "messages"
        ADD CONSTRAINT "messages_ticket_id_fkey"
        FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id");
    `);
  }
}
