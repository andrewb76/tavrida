-- NestJS microservice schemas (ADR-001). Created on first Postgres init.
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS plan_config;
CREATE SCHEMA IF NOT EXISTS auction;
CREATE SCHEMA IF NOT EXISTS subscriptions;
CREATE SCHEMA IF NOT EXISTS auction_subscriptions; -- legacy alias schema (unused; prefer subscriptions)
CREATE SCHEMA IF NOT EXISTS user_profile;
CREATE SCHEMA IF NOT EXISTS scalar_config;
CREATE SCHEMA IF NOT EXISTS forum;
CREATE SCHEMA IF NOT EXISTS periods;
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS deal_feedback;
