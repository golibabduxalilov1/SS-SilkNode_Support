"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveFirstResponseTracking1755500000000 = void 0;
class RemoveFirstResponseTracking1755500000000 {
    constructor() {
        this.name = 'RemoveFirstResponseTracking1755500000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "first_response_at",
        DROP COLUMN IF EXISTS "first_response_minutes";
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "tickets"
        ADD COLUMN "first_response_at" TIMESTAMPTZ,
        ADD COLUMN "first_response_minutes" INTEGER;
    `);
    }
}
exports.RemoveFirstResponseTracking1755500000000 = RemoveFirstResponseTracking1755500000000;
//# sourceMappingURL=1755500000000-RemoveFirstResponseTracking.js.map