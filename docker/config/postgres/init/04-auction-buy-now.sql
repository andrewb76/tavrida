-- Add buy_now_price column for Buy It Now (ADR-021)
-- Run in production before deploying auction service with BIN support

ALTER TABLE "auction"."auction"
  ADD COLUMN IF NOT EXISTS "buy_now_price" NUMERIC(12, 2);

COMMENT ON COLUMN "auction"."auction"."buy_now_price" IS 'Buy It Now price (NULL = BIN disabled). See ADR-021.';
