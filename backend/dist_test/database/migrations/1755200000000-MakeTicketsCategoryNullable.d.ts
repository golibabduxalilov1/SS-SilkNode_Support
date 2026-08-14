import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class MakeTicketsCategoryNullable1755200000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
