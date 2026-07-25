-- Logto OSS database (same Postgres instance as platform).
-- Runs only on empty PG volume; existing volumes use logto-db-init service.
CREATE DATABASE logto;
