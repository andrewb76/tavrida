import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuctionCategories1784247600000 implements MigrationInterface {
  name = 'AddAuctionCategories1784247600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "auction"."auction_category" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "legacy_id" integer NOT NULL,
      "parent_legacy_id" integer,
      "parent_id" uuid,
      "name" character varying(256) NOT NULL,
      "level" integer NOT NULL DEFAULT 0,
      "left_id" integer NOT NULL DEFAULT 0,
      "right_id" integer NOT NULL DEFAULT 0,
      "auction_count" integer NOT NULL DEFAULT 0,
      CONSTRAINT "PK_auction_category_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_auction_category_legacy_id" UNIQUE ("legacy_id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_auction_category_parent_id" ON "auction"."auction_category" ("parent_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_auction_category_left_right" ON "auction"."auction_category" ("left_id", "right_id")`);

    await queryRunner.query(`CREATE TABLE "auction"."user_id_mapping" (
      "legacy_id" integer NOT NULL,
      "logto_id" character varying(128) NOT NULL,
      "nick" character varying(20),
      "email" character varying(50),
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_user_id_mapping_legacy_id" PRIMARY KEY ("legacy_id"),
      CONSTRAINT "UQ_user_id_mapping_logto_id" UNIQUE ("logto_id")
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auction"."user_id_mapping"`);
    await queryRunner.query(`DROP TABLE "auction"."auction_category"`);
  }
}
