"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeTicketsCategoryNullable1755200000000 = void 0;
class MakeTicketsCategoryNullable1755200000000 {
    constructor() {
        this.name = 'MakeTicketsCategoryNullable1755200000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "tickets" ALTER COLUMN "category" DROP NOT NULL;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      UPDATE "tickets" SET "category" = '' WHERE "category" IS NULL;
      ALTER TABLE "tickets" ALTER COLUMN "category" SET NOT NULL;
    `);
    }
}
exports.MakeTicketsCategoryNullable1755200000000 = MakeTicketsCategoryNullable1755200000000;
//# sourceMappingURL=1755200000000-MakeTicketsCategoryNullable.js.map