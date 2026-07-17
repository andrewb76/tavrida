import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuctionOutbox1784246500000 implements MigrationInterface {
  name = 'AddAuctionOutbox1784246500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "auction"."outbox_message" ("event_id" uuid NOT NULL, "event_type" character varying(128) NOT NULL, "envelope" jsonb NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "available_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempt_count" integer NOT NULL DEFAULT 0, "published_at" TIMESTAMP WITH TIME ZONE, "last_error" text, "locked_until" TIMESTAMP WITH TIME ZONE, "locked_by" character varying(128), CONSTRAINT "PK_auction_outbox_message" PRIMARY KEY ("event_id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_pending" ON "auction"."outbox_message" ("available_at") WHERE "published_at" IS NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auction"."outbox_message"');
  }
}
