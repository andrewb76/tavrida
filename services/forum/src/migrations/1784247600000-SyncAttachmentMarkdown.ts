import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sync attachment URLs into body as markdown links.
 *
 * - Image attachments → `![filename](url)`
 * - Other attachments (PDF, etc.) → `[filename](url)`
 *
 * Only adds links that are not already present in body.
 */
export class SyncAttachmentMarkdown1784247600000 implements MigrationInterface {
  name = 'SyncAttachmentMarkdown1784247600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Topics: add missing attachment markdown links
    await queryRunner.query(`
      UPDATE forum.topic t
      SET body = t.body || E'\n\n' || sub.missing_markdown
      FROM (
        SELECT
          t2.id AS topic_id,
          string_agg(
            CASE
              WHEN (a->>'contentType') LIKE 'image/%'
              THEN '![' || (a->>'filename') || '](' || (a->>'url') || ')'
              ELSE '[' || (a->>'filename') || '](' || (a->>'url') || ')'
            END,
            E'\n'
          ) AS missing_markdown
        FROM forum.topic t2,
             jsonb_array_elements(t2.attachments) a
        WHERE t2.attachments != '[]'::jsonb
          AND t2.body NOT LIKE '%' || (a->>'url') || '%'
        GROUP BY t2.id
      ) sub
      WHERE t.id = sub.topic_id
        AND sub.missing_markdown IS NOT NULL
    `);

    // Comments: add missing attachment markdown links
    await queryRunner.query(`
      UPDATE forum.comment c
      SET body = c.body || E'\n\n' || sub.missing_markdown
      FROM (
        SELECT
          c2.id AS comment_id,
          string_agg(
            CASE
              WHEN (a->>'contentType') LIKE 'image/%'
              THEN '![' || (a->>'filename') || '](' || (a->>'url') || ')'
              ELSE '[' || (a->>'filename') || '](' || (a->>'url') || ')'
            END,
            E'\n'
          ) AS missing_markdown
        FROM forum.comment c2,
             jsonb_array_elements(c2.attachments) a
        WHERE c2.attachments != '[]'::jsonb
          AND c2.body NOT LIKE '%' || (a->>'url') || '%'
        GROUP BY c2.id
      ) sub
      WHERE c.id = sub.comment_id
        AND sub.missing_markdown IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort removal: strip lines that are purely markdown image/link to attachment URLs.
    // This is imperfect if the user had similar-looking manual links, but preserves reversibility.
    await queryRunner.query(`
      UPDATE forum.topic t
      SET body = regexp_replace(
        t.body,
        E'(^|\\n)\\!?\\[[^\\]]*\\]\\([^)]*forum-attachments[^)]*\\)\\s*$',
        '',
        'g'
      )
      WHERE t.attachments != '[]'::jsonb
    `);

    await queryRunner.query(`
      UPDATE forum.comment c
      SET body = regexp_replace(
        c.body,
        E'(^|\\n)\\!?\\[[^\\]]*\\]\\([^)]*forum-attachments[^)]*\\)\\s*$',
        '',
        'g'
      )
      WHERE c.attachments != '[]'::jsonb
    `);
  }
}
