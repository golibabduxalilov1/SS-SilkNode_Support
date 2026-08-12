import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bug fix: fayl biriktirilganda "message_id" hech qachon o'rnatilmasdi
 * (backend/src/attachments/attachments.controller.ts), shuning uchun
 * eski yozuvlarda "attachments.message_id" NULL bo'lib qolgan — bunday
 * fayllar chatda (message.attachments orqali) hech qachon ko'rinmagan.
 *
 * Har bir shunday "yetim" attachment uchun uni yuklagan foydalanuvchi
 * (ticket egasi) nomidan bitta xabar yaratib, attachment shu xabarga
 * bog'lanadi — shu bilan eski fayllar ham chatda ko'rina boshlaydi.
 */
export class BackfillOrphanAttachmentMessages1755400000000 implements MigrationInterface {
  name = 'BackfillOrphanAttachmentMessages1755400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const orphans: Array<{
      id: string;
      ticket_id: string;
      file_name: string;
      created_at: Date;
      created_by_id: string;
    }> = await queryRunner.query(`
      SELECT a."id", a."ticket_id", a."file_name", a."created_at", t."created_by_id"
      FROM "attachments" a
      JOIN "tickets" t ON t."id" = a."ticket_id"
      WHERE a."message_id" IS NULL
    `);

    for (const orphan of orphans) {
      const [message] = await queryRunner.query(
        `INSERT INTO "messages" ("ticket_id", "sender_id", "text", "created_at")
         VALUES ($1, $2, $3, $4)
         RETURNING "id"`,
        [orphan.ticket_id, orphan.created_by_id, `📎 ${orphan.file_name}`, orphan.created_at],
      );

      await queryRunner.query(`UPDATE "attachments" SET "message_id" = $1 WHERE "id" = $2`, [
        message.id,
        orphan.id,
      ]);
    }
  }

  public async down(): Promise<void> {
    // Ma'lumotlarni orqaga qaytarish (sintetik xabarlarni ajratib olish)
    // xavfli va foydasiz, shuning uchun bu migratsiya qaytarilmaydi.
  }
}
