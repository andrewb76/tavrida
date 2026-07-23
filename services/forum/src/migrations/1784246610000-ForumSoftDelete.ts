import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ForumSoftDelete1784246610000 implements MigrationInterface {
  name = 'ForumSoftDelete1784246610000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forum"."topic"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "forum"."comment"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "forum"."comment" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "forum"."topic" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
