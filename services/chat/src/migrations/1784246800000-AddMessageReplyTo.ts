import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageReplyTo1784246800000 implements MigrationInterface {
  name = 'AddMessageReplyTo1784246800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."message"
      ADD COLUMN IF NOT EXISTS "reply_to_message_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_message_reply_to"
      ON "chat"."message" ("reply_to_message_id")
      WHERE "reply_to_message_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "chat"."idx_message_reply_to"`,
    );
    await queryRunner.query(`
      ALTER TABLE "chat"."message"
      DROP COLUMN IF EXISTS "reply_to_message_id"
    `);
  }
}
