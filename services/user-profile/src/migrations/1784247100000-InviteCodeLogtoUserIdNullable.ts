import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InviteCodeLogtoUserIdNullable1784247100000 implements MigrationInterface {
  name = 'InviteCodeLogtoUserIdNullable1784247100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" ALTER COLUMN "logto_user_id" DROP NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE "user_profile"."invite_code" SET "logto_user_id" = \'\' WHERE "logto_user_id" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "user_profile"."invite_code" ALTER COLUMN "logto_user_id" SET NOT NULL',
    );
  }
}
