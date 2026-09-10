#!/usr/bin/env node

/**
 * WeBid Auction Data Migration Script
 *
 * Migrates categories, user_id_mapping, auctions, and bids from WeBid MariaDB
 * to Tavrida PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL=postgres://... LOGTO_DATABASE_URL=postgres://... node scripts/migrate-auction-data.mjs [--dry-run]
 *
 * Prerequisites:
 * - MariaDB container running: docker run -d --name tavrida_mariadb_check \
 *     -v /home/andrew/archive/dc-forum/db/mariadb/data:/var/lib/mysql \
 *     -e MYSQL_ROOT_PASSWORD=punbb_forum mariadb:10.6
 * - PostgreSQL with auction schema (migrations applied)
 */

import pg from 'pg';
import mariadb from 'mariadb';

const DRY_RUN = process.argv.includes('--dry-run');

const MARIADB_CONFIG = {
  host: process.env.MARIADB_HOST || 'localhost',
  port: Number(process.env.MARIADB_PORT || 3307),
  user: 'root',
  password: 'punbb_forum',
  database: 'aukc19',
  connectTimeout: 10000,
};

const DATABASE_URL = process.env.DATABASE_URL;
const LOGTO_DATABASE_URL = process.env.LOGTO_DATABASE_URL || DATABASE_URL?.replace('/tavrida_lot', '/logto');

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

function escapeSql(str) {
  if (str == null) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function toTimestamp(unixTimestamp) {
  if (!unixTimestamp || unixTimestamp === '0') return null;
  const ts = Number(unixTimestamp);
  if (isNaN(ts) || ts === 0) return null;
  return new Date(ts * 1000);
}

async function main() {
  console.log('=== WeBid Auction Data Migration ===');
  if (DRY_RUN) console.log('** DRY RUN — no changes will be written **\n');

  const pgPool = new pg.Pool({ connectionString: DATABASE_URL });
  const pgClient = await pgPool.connect();

  const logtoPool = new pg.Pool({ connectionString: LOGTO_DATABASE_URL });
  const logtoClient = await logtoPool.connect();

  let mariaConn;
  try {
    mariaConn = await mariadb.createConnection(MARIADB_CONFIG);
  } catch (err) {
    console.error('Failed to connect to MariaDB. Is the container running?');
    console.error('Start with: docker run -d --name tavrida_mariadb_export \\');
    console.error('  -v /home/andrew/archive/dc-forum/db/mariadb/data:/var/lib/mysql \\');
    console.error('  -p 3307:3306 -e MYSQL_ROOT_PASSWORD=punbb_forum mariadb:10.6');
    process.exit(1);
  }

  const sqlLines = [];

  try {
    await pgClient.query('BEGIN');

    // ─── Step 1: Migrate categories ────────────────────────────
    console.log('1. Migrating categories...');
    const categories = await mariaConn.query(
      'SELECT cat_id, parent_id, left_id, right_id, level, cat_name FROM w16_categories WHERE cat_id != 1 ORDER BY left_id'
    );
    console.log(`   Found ${categories.length} visible categories`);

    const categoryMap = new Map(); // WeBid cat_id -> Tavrida UUID

    for (const cat of categories) {
      if (DRY_RUN) {
        const fakeId = `fake-cat-${cat.cat_id}`;
        categoryMap.set(cat.cat_id, fakeId);
        console.log(`   [DRY] Would insert category: ${cat.cat_id} "${cat.cat_name}" -> ${fakeId}`);
        continue;
      }

      const result = await pgClient.query(
        `INSERT INTO "auction"."auction_category" (legacy_id, parent_legacy_id, name, level, left_id, right_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (legacy_id) DO UPDATE SET name = $3
         RETURNING id`,
        [cat.cat_id, cat.parent_id, cat.cat_name, cat.level, cat.left_id, cat.right_id]
      );
      categoryMap.set(cat.cat_id, result.rows[0].id);
    }

    // Update parent_id references
    for (const cat of categories) {
      if (cat.parent_id && cat.parent_id !== -1 && categoryMap.has(cat.parent_id)) {
        if (!DRY_RUN) {
          await pgClient.query(
            `UPDATE "auction"."auction_category" SET parent_id = $1 WHERE legacy_id = $2`,
            [categoryMap.get(cat.parent_id), cat.cat_id]
          );
        }
      }
    }
    console.log(`   Migrated ${categoryMap.size} categories\n`);

    // ─── Step 2: Migrate user_id_mapping ───────────────────────
    console.log('2. Migrating user_id_mapping...');
    const users = await mariaConn.query(
      'SELECT id, nick, email FROM w16_users ORDER BY id'
    );
    console.log(`   Found ${users.length} users`);

    let mappedCount = 0;
    let unmappedCount = 0;

    for (const user of users) {
      const logtoResult = await logtoClient.query(
        `SELECT id FROM public.users WHERE primary_email = $1 LIMIT 1`,
        [user.email]
      );

      if (logtoResult.rows.length > 0) {
        const logtoId = logtoResult.rows[0].id;
        if (!DRY_RUN) {
          await pgClient.query(
            `INSERT INTO "auction"."user_id_mapping" (legacy_id, logto_id, nick, email)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (legacy_id) DO UPDATE SET logto_id = $2, nick = $3, email = $4`,
            [user.id, logtoId, user.nick, user.email]
          );
        }
        mappedCount++;
      } else {
        unmappedCount++;
      }
    }
    console.log(`   Mapped: ${mappedCount}, Unmapped (no Logto account): ${unmappedCount}\n`);

    // ─── Step 3: Migrate auctions ──────────────────────────────
    console.log('3. Migrating auctions...');
    const auctions = await mariaConn.query(
      `SELECT id, user, title, subtitle, starts, description, pict_url, category, secondcat,
              minimum_bid, shipping_cost, additional_shipping_cost, reserve_price, buy_now,
              auction_type, duration, increment, ends, current_bid, current_bid_id,
              closed, suspended, num_bids, sold, bn_only, bold, highlighted, featured
       FROM w16_auctions ORDER BY id`
    );
    console.log(`   Found ${auctions.length} auctions`);

    const auctionMap = new Map(); // WeBid auction id -> Tavrida UUID
    let insertedAuctions = 0;

    for (const auc of auctions) {
      // Map status
      let status = 'ENDED';
      if (auc.suspended === 1) status = 'CANCELLED';
      else if (auc.closed === 0 && auc.sold === 'n') status = 'ACTIVE';
      else if (auc.sold === 'y') status = 'ENDED';

      // Map auction type
      const type = auc.auction_type === 2 ? 'DUTCH' : 'ENGLISH';

      // Parse images from pict_url (pipe-delimited)
      const images = auc.pict_url
        ? auc.pict_url.split('|').filter(Boolean).map(u => u.trim())
        : [];

      // Map category_id
      const categoryId = auc.category && categoryMap.has(auc.category)
        ? categoryMap.get(auc.category)
        : null;

      // Map user_id via user_id_mapping
      const userMapping = await pgClient.query(
        `SELECT logto_id FROM "auction"."user_id_mapping" WHERE legacy_id = $1`,
        [auc.user]
      );
      const sellerId = userMapping.rows.length > 0
        ? userMapping.rows[0].logto_id
        : `legacy-user-${auc.user}`;

      // Map winner_id
      let winnerId = null;
      if (auc.current_bid_id && auc.current_bid_id > 0) {
        const winnerMapping = await pgClient.query(
          `SELECT logto_id FROM "auction"."user_id_mapping" WHERE legacy_id = $1`,
          [auc.current_bid_id]
        );
        winnerId = winnerMapping.rows.length > 0
          ? winnerMapping.rows[0].logto_id
          : `legacy-user-${auc.current_bid_id}`;
      }

      // Parse timestamps
      const startsAt = toTimestamp(auc.starts);
      const endsAt = toTimestamp(auc.ends);

      if (DRY_RUN) {
        const fakeId = `fake-auction-${auc.id}`;
        auctionMap.set(auc.id, fakeId);
        console.log(`   [DRY] Would insert auction: ${auc.id} "${auc.title}"`);
        continue;
      }

      const result = await pgClient.query(
        `INSERT INTO "auction"."auction"
         (id, seller_id, category_id, title, description, type, status,
          starting_price, current_price, bid_increment, reserve_price,
          currency, starts_at, ends_at, winner_id, bid_count, images)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'RUB', $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          sellerId, categoryId, auc.title, auc.description || '', type, status,
          auc.minimum_bid || 0, auc.current_bid || 0, auc.increment || 1,
          auc.reserve_price || null,
          startsAt, endsAt, winnerId, auc.num_bids || 0,
          JSON.stringify(images),
        ]
      );

      if (result.rows.length > 0) {
        auctionMap.set(auc.id, result.rows[0].id);
        insertedAuctions++;
      }
    }
    console.log(`   Inserted ${insertedAuctions} auctions\n`);

    // ─── Step 4: Migrate bids ──────────────────────────────────
    console.log('4. Migrating bids...');
    const bids = await mariaConn.query(
      'SELECT id, auction, bidder, bid, bidwhen, quantity FROM w16_bids ORDER BY id'
    );
    console.log(`   Found ${bids.length} bids`);

    let insertedBids = 0;

    for (const bid of bids) {
      const auctionId = auctionMap.get(bid.auction);
      if (!auctionId) continue;

      // Map bidder
      const bidderMapping = await pgClient.query(
        `SELECT logto_id FROM "auction"."user_id_mapping" WHERE legacy_id = $1`,
        [bid.bidder]
      );
      const bidderId = bidderMapping.rows.length > 0
        ? bidderMapping.rows[0].logto_id
        : `legacy-user-${bid.bidder}`;

      const placedAt = toTimestamp(bid.bidwhen);

      if (DRY_RUN) {
        console.log(`   [DRY] Would insert bid: ${bid.id} on auction ${bid.auction}`);
        continue;
      }

      const result = await pgClient.query(
        `INSERT INTO "auction"."bid"
         (id, auction_id, bidder_id, amount, currency, placed_at, is_winning)
         VALUES (uuid_generate_v4(), $1, $2, $3, 'RUB', $4, false)
         ON CONFLICT (id) DO NOTHING`,
        [auctionId, bidderId, bid.bid || 0, placedAt]
      );

      if (result.rowCount > 0) insertedBids++;
    }
    console.log(`   Inserted ${insertedBids} bids\n`);

    // ─── Step 5: Update category auction counts ────────────────
    if (!DRY_RUN) {
      console.log('5. Updating category auction counts...');
      await pgClient.query(
        `UPDATE "auction"."auction_category" c
         SET auction_count = (
           SELECT COUNT(*)::int FROM "auction"."auction" a
           WHERE a.category_id = c.id
         )`
      );
      console.log('   Done\n');
    }

    if (!DRY_RUN) {
      await pgClient.query('COMMIT');
    } else {
      await pgClient.query('ROLLBACK');
    }

    console.log('=== Migration complete! ===');
  } catch (err) {
    await pgClient.query('ROLLBACK');
    throw err;
  } finally {
    pgClient.release();
    await pgPool.end();
    logtoClient.release();
    await logtoPool.end();
    if (mariaConn) await mariaConn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
