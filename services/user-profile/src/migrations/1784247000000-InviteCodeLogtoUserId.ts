import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InviteCodeLogtoUserId1784247000000 implements MigrationInterface {
  name = 'InviteCodeLogtoUserId1784247000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" RENAME COLUMN "logto_token" TO "logto_user_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" ALTER COLUMN "logto_user_id" DROP NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" ALTER COLUMN "logto_user_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" RENAME COLUMN "logto_user_id" TO "logto_token"',
    );
  }
}
