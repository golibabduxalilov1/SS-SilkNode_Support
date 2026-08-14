"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackfillOrphanAttachmentMessages1755400000000 = void 0;
class BackfillOrphanAttachmentMessages1755400000000 {
    constructor() {
        this.name = 'BackfillOrphanAttachmentMessages1755400000000';
    }
    async up(queryRunner) {
        const orphans = await queryRunner.query(`
      SELECT a."id", a."ticket_id", a."file_name", a."created_at", t."created_by_id"
      FROM "attachments" a
      JOIN "tickets" t ON t."id" = a."ticket_id"
      WHERE a."message_id" IS NULL
    `);
        for (const orphan of orphans) {
            const [message] = await queryRunner.query(`INSERT INTO "messages" ("ticket_id", "sender_id", "text", "created_at")
         VALUES ($1, $2, $3, $4)
         RETURNING "id"`, [orphan.ticket_id, orphan.created_by_id, `📎 ${orphan.file_name}`, orphan.created_at]);
            await queryRunner.query(`UPDATE "attachments" SET "message_id" = $1 WHERE "id" = $2`, [
                message.id,
                orphan.id,
            ]);
        }
    }
    async down() {
    }
}
exports.BackfillOrphanAttachmentMessages1755400000000 = BackfillOrphanAttachmentMessages1755400000000;
//# sourceMappingURL=1755400000000-BackfillOrphanAttachmentMessages.js.map