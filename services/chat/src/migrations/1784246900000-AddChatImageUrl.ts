import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatImageUrl1784246900000 implements MigrationInterface {
  name = 'AddChatImageUrl1784246900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."chat"
      ADD COLUMN IF NOT EXISTS "image_url" varchar(512)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."chat"
      DROP COLUMN IF EXISTS "image_url"
    `);
  }
}
