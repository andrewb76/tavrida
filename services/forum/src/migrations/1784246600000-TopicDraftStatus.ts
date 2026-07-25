import { MigrationInterface, QueryRunner } from 'typeorm';

export class TopicDraftStatus1784246600000 implements MigrationInterface {
  name = 'TopicDraftStatus1784246600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum.topic
        ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'PUBLISHED',
        ADD COLUMN IF NOT EXISTS published_at timestamptz NULL
    `);
    await queryRunner.query(`
      UPDATE forum.topic
      SET published_at = created_at
      WHERE status = 'PUBLISHED' AND published_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS topic_status_created_idx
        ON forum.topic (status, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS topic_author_status_idx
        ON forum.topic (author_id, status, updated_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS forum.topic_author_status_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS forum.topic_status_created_idx`);
    await queryRunner.query(`
      ALTER TABLE forum.topic
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS status
    `);
  }
}
