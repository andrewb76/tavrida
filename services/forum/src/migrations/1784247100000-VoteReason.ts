import type { MigrationInterface, QueryRunner } from 'typeorm';

export class VoteReason1784247100000 implements MigrationInterface {
  name = 'VoteReason1784247100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "forum"."content_vote" ADD COLUMN "reason" varchar(512)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "forum"."content_vote" DROP COLUMN "reason"`,
    );
  }
}
