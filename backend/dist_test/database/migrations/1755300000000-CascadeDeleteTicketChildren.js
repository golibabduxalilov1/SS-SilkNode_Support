"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeDeleteTicketChildren1755300000000 = void 0;
class CascadeDeleteTicketChildren1755300000000 {
    constructor() {
        this.name = 'CascadeDeleteTicketChildren1755300000000';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
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
exports.CascadeDeleteTicketChildren1755300000000 = CascadeDeleteTicketChildren1755300000000;
//# sourceMappingURL=1755300000000-CascadeDeleteTicketChildren.js.map