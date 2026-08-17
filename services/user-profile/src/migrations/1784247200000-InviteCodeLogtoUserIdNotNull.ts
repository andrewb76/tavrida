import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InviteCodeLogtoUserIdNotNull1784247200000 implements MigrationInterface {
  name = 'InviteCodeLogtoUserIdNotNull1784247200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE "user_profile"."invite_code" SET "logto_user_id" = \'\' WHERE "logto_user_id" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" ALTER COLUMN "logto_user_id" SET NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" ALTER COLUMN "logto_user_id" DROP NOT NULL',
    );
  }
}
