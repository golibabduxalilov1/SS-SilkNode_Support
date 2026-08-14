import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class BackfillOrphanAttachmentMessages1755400000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
}
