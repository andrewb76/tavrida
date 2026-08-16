import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenIdempotencyKey1784246900000 implements MigrationInterface {
  name = 'WidenIdempotencyKey1784246900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "billing"."transaction" ALTER COLUMN "idempotency_key" TYPE varchar(128)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "billing"."transaction" ALTER COLUMN "idempotency_key" TYPE varchar(64)',
    );
  }
}
