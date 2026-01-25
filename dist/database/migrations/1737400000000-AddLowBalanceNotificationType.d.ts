import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddLowBalanceNotificationType1737400000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(_queryRunner: QueryRunner): Promise<void>;
}
