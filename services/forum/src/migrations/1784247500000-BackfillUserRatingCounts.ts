import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillUserRatingCounts1784247500000 implements MigrationInterface {
  name = 'BackfillUserRatingCounts1784247500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill postCount: count published, non-deleted topics per author
    await queryRunner.query(`
      INSERT INTO user_profile.user_rating (user_id, post_count, comment_count, total_rating, karma, referral_karma, referral_rating, verified_sales, pending_sales)
      SELECT
        t.author_id,
        COUNT(*)::int,
        0,
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        0,
        0
      FROM forum.topic t
      WHERE t.deleted_at IS NULL
        AND t.status = 'PUBLISHED'
      GROUP BY t.author_id
      ON CONFLICT (user_id) DO UPDATE SET
        post_count = EXCLUDED.post_count
    `);

    // Backfill commentCount: count non-deleted comments per author
    await queryRunner.query(`
      INSERT INTO user_profile.user_rating (user_id, post_count, comment_count, total_rating, karma, referral_karma, referral_rating, verified_sales, pending_sales)
      SELECT
        c.author_id,
        0,
        COUNT(*)::int,
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        0,
        0
      FROM forum.comment c
      WHERE c.deleted_at IS NULL
      GROUP BY c.author_id
      ON CONFLICT (user_id) DO UPDATE SET
        comment_count = EXCLUDED.comment_count
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE user_profile.user_rating SET post_count = 0, comment_count = 0`);
  }
}
