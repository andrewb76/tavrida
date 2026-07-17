import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialUserProfileSchema1784246400000 implements MigrationInterface {
  name = 'InitialUserProfileSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['user_profile', 'user_profile_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['user_profile'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["user_rating","user_profile","reputation_change_log","profile_note","invite_code","invitation"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline user_profile schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"user_profile\".\"user_rating\" (\"user_id\" character varying(128) NOT NULL, \"total_rating\" numeric(4,2) NOT NULL DEFAULT '0', \"karma\" numeric(10,2) NOT NULL DEFAULT '0', \"referral_karma\" numeric(10,2) NOT NULL DEFAULT '0', \"referral_rating\" numeric(4,2) NOT NULL DEFAULT '0', \"verified_sales\" integer NOT NULL DEFAULT '0', \"pending_sales\" integer NOT NULL DEFAULT '0', \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_e43dc444624c27b2fd55fa8f5f4\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"user_profile\".\"user_profile\" (\"user_id\" character varying(128) NOT NULL, \"inviter_id\" character varying(128), \"invitation_accepted_at\" TIMESTAMP WITH TIME ZONE, \"display_name\" character varying, \"email\" character varying, \"username\" character varying, \"avatar_url\" character varying, \"primary_phone\" character varying, \"is_suspended\" boolean NOT NULL DEFAULT false, \"deleted_at\" TIMESTAMP WITH TIME ZONE, \"logto_synced_at\" TIMESTAMP WITH TIME ZONE, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_eee360f3bff24af1b6890765201\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"user_profile\".\"reputation_change_log\" (\"id\" uuid NOT NULL, \"user_id\" character varying(128) NOT NULL, \"metric\" character varying(16) NOT NULL, \"delta\" numeric(10,2) NOT NULL, \"balance_after\" numeric(10,2) NOT NULL, \"source\" character varying(32) NOT NULL, \"actor_id\" character varying(128), \"reference_id\" character varying(128), \"note\" character varying(512), \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_b88be896f616b5f5bc011f43e42\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"IDX_5213596ba7b46311495aa77bec\" ON \"user_profile\".\"reputation_change_log\" (\"user_id\", \"metric\", \"created_at\") ");
    await queryRunner.query("CREATE TABLE \"user_profile\".\"profile_note\" (\"id\" uuid NOT NULL, \"owner_id\" character varying(128) NOT NULL, \"author_id\" character varying(128) NOT NULL, \"text\" text NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"uq_profile_note_owner_author\" UNIQUE (\"owner_id\", \"author_id\"), CONSTRAINT \"PK_872b29a15e8761e7fb974b90e74\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"user_profile\".\"invite_code\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"code\" character varying NOT NULL, \"issuer_id\" character varying(128) NOT NULL, \"logto_token\" character varying NOT NULL, \"email\" character varying, \"max_uses\" integer NOT NULL DEFAULT '1', \"uses_count\" integer NOT NULL DEFAULT '0', \"expires_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"UQ_d3b40184c2e31f1c26f9424ac18\" UNIQUE (\"code\"), CONSTRAINT \"PK_a8940979efb1a84ca3470a09c85\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"user_profile\".\"invitation\" (\"invitee_id\" character varying(128) NOT NULL, \"inviter_id\" character varying(128) NOT NULL, \"invite_code_id\" uuid, \"accepted_at\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"PK_6550cbd7f347507c5417fb6522b\" PRIMARY KEY (\"invitee_id\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"user_profile\".\"invitation\"");
    await queryRunner.query("DROP TABLE \"user_profile\".\"invite_code\"");
    await queryRunner.query("DROP TABLE \"user_profile\".\"profile_note\"");
    await queryRunner.query("DROP INDEX \"user_profile\".\"IDX_5213596ba7b46311495aa77bec\"");
    await queryRunner.query("DROP TABLE \"user_profile\".\"reputation_change_log\"");
    await queryRunner.query("DROP TABLE \"user_profile\".\"user_profile\"");
    await queryRunner.query("DROP TABLE \"user_profile\".\"user_rating\"");
  }
}
