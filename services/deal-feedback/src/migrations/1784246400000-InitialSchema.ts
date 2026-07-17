import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDealFeedbackSchema1784246400000 implements MigrationInterface {
  name = 'InitialDealFeedbackSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['deal_feedback', 'deal_feedback_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['deal_feedback'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["processed_event","pending_deal_feedback","deal_feedback"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline deal_feedback schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"deal_feedback\".\"processed_event\" (\"eventId\" uuid NOT NULL, \"eventType\" character varying(128) NOT NULL, \"processedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_276e1594ffc073ea1605951715c\" PRIMARY KEY (\"eventId\"))");
    await queryRunner.query("CREATE TABLE \"deal_feedback\".\"pending_deal_feedback\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"dealType\" character varying(16) NOT NULL, \"auctionId\" uuid, \"orderId\" uuid, \"userId\" character varying(128) NOT NULL, \"notificationSentAt\" TIMESTAMP WITH TIME ZONE, \"remindersCount\" integer NOT NULL DEFAULT '0', \"lastReminderAt\" TIMESTAMP WITH TIME ZONE, \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_7f835304a02bd3d8d78ba4dbdec\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_pending_user\" ON \"deal_feedback\".\"pending_deal_feedback\" (\"userId\") ");
    await queryRunner.query("CREATE TABLE \"deal_feedback\".\"deal_feedback\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"dealType\" character varying(16) NOT NULL, \"auctionId\" uuid, \"orderId\" uuid, \"sellerId\" character varying(128) NOT NULL, \"buyerId\" character varying(128) NOT NULL, \"sellerRating\" numeric(2,0), \"buyerRating\" numeric(2,0), \"sellerComment\" text, \"buyerComment\" text, \"submittedBySellerAt\" TIMESTAMP WITH TIME ZONE, \"submittedByBuyerAt\" TIMESTAMP WITH TIME ZONE, \"finalisedAt\" TIMESTAMP WITH TIME ZONE, \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_d46063a34c48f5ec34c4aaa1373\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_deal_feedback_auction\" ON \"deal_feedback\".\"deal_feedback\" (\"auctionId\") ");
    await queryRunner.query("CREATE INDEX \"idx_deal_feedback_order\" ON \"deal_feedback\".\"deal_feedback\" (\"orderId\") ");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX \"deal_feedback\".\"idx_deal_feedback_order\"");
    await queryRunner.query("DROP INDEX \"deal_feedback\".\"idx_deal_feedback_auction\"");
    await queryRunner.query("DROP TABLE \"deal_feedback\".\"deal_feedback\"");
    await queryRunner.query("DROP INDEX \"deal_feedback\".\"idx_pending_user\"");
    await queryRunner.query("DROP TABLE \"deal_feedback\".\"pending_deal_feedback\"");
    await queryRunner.query("DROP TABLE \"deal_feedback\".\"processed_event\"");
  }
}
