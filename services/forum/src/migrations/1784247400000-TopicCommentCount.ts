import { MigrationInterface, QueryRunner } from 'typeorm';

export class TopicCommentCount1784247400000 implements MigrationInterface {
  name = 'TopicCommentCount1784247400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum.topic ADD COLUMN IF NOT EXISTS comment_count int NOT NULL DEFAULT 0
    `);

    // Backfill from existing comments (only non-deleted comments in non-deleted published topics)
    await queryRunner.query(`
      UPDATE forum.topic t
      SET comment_count = sub.cnt
      FROM (
        SELECT c.topic_id, COUNT(*)::int AS cnt
        FROM forum.comment c
        INNER JOIN forum.topic t2 ON t2.id = c.topic_id
        WHERE c.deleted_at IS NULL
          AND t2.deleted_at IS NULL
        GROUP BY c.topic_id
      ) sub
      WHERE t.id = sub.topic_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE forum.topic DROP COLUMN IF EXISTS comment_count`);
  }
}
