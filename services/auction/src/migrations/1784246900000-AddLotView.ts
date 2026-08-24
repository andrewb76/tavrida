import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLotView1784246900000 implements MigrationInterface {
  name = 'AddLotView1784246900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auction"."lot_view" (
        "auction_id" uuid NOT NULL,
        "user_id"    varchar(128) NOT NULL,
        "viewed_at"  timestamptz  NOT NULL DEFAULT now(),
        "is_hidden"  boolean      NOT NULL DEFAULT false,
        CONSTRAINT "PK_lot_view" PRIMARY KEY ("auction_id", "user_id")
      )`,
    );
    await queryRunner.query(
      'CREATE INDEX "idx_lot_view_auction" ON "auction"."lot_view" ("auction_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auction"."lot_view"');
  }
}
