import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSettingsSchema1790380800000 implements MigrationInterface {
  name = 'InitSettingsSchema1790380800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS settings`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.parameter (
        key varchar(128) NOT NULL,
        service varchar(64) NOT NULL,
        category varchar(16) NOT NULL,
        name text DEFAULT ''::text NOT NULL,
        description text DEFAULT ''::text NOT NULL,
        param_type varchar(16) DEFAULT 'int'::varchar NOT NULL,
        default_value jsonb,
        user_override boolean DEFAULT false NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        sync_status varchar(16) DEFAULT 'active'::varchar NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_parameter" PRIMARY KEY (key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.plan (
        id varchar(32) NOT NULL,
        title text NOT NULL,
        description text DEFAULT ''::text NOT NULL,
        monthly_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
        yearly_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_plan" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.plan_value (
        plan_id varchar(32) NOT NULL,
        param_key varchar(128) NOT NULL,
        value jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_plan_value" PRIMARY KEY (plan_id, param_key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.system_value (
        param_key varchar(128) NOT NULL,
        value jsonb NOT NULL,
        updated_by varchar(128),
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_system_value" PRIMARY KEY (param_key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.user_value (
        user_id varchar(128) NOT NULL,
        param_key varchar(128) NOT NULL,
        value jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_user_value" PRIMARY KEY (user_id, param_key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.user_limit (
        param_key varchar(128) NOT NULL,
        plan_id varchar(32) NOT NULL,
        user_id varchar(128) NOT NULL,
        period varchar(8) NOT NULL,
        max_value integer NOT NULL,
        remaining integer NOT NULL,
        cycle_start timestamptz NOT NULL,
        cycle_end timestamptz NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_user_limit" PRIMARY KEY (param_key, plan_id, user_id, period)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.user_subscription (
        user_id varchar(128) NOT NULL,
        plan_id varchar(32) NOT NULL,
        starts_at timestamptz NOT NULL,
        expires_at timestamptz,
        auto_renew boolean DEFAULT false NOT NULL,
        billing_period varchar(16),
        status varchar(16) DEFAULT 'ACTIVE'::varchar NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "PK_settings_user_subscription" PRIMARY KEY (user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.limit_purchase (
        id uuid NOT NULL,
        param_key varchar(128) NOT NULL,
        user_id varchar(128) NOT NULL,
        period varchar(8) NOT NULL,
        purchased integer DEFAULT 0 NOT NULL,
        used integer DEFAULT 0 NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        meta jsonb,
        CONSTRAINT "PK_settings_limit_purchase" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings.limit_usage_log (
        id uuid NOT NULL,
        param_key varchar(128) NOT NULL,
        plan_id varchar(32) NOT NULL,
        user_id varchar(128) NOT NULL,
        period varchar(8) NOT NULL,
        delta integer NOT NULL,
        remaining_after integer NOT NULL,
        source varchar(16) DEFAULT 'base'::varchar NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        meta jsonb,
        CONSTRAINT "PK_settings_limit_usage_log" PRIMARY KEY (id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS settings.limit_usage_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.limit_purchase`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.user_subscription`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.user_limit`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.user_value`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.system_value`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.plan_value`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.plan`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings.parameter`);
  }
}
