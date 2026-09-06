/**
 * Migrate PunBB reputation → user_profile.karma + reputation_change_log
 *
 * Strategy:
 *   1. Aggregate +1/-1 per target user from PunBB `reputation` table
 *   2. Map PunBB user_id → Logto user_id via users.json
 *   3. Upsert user_profile.user_rating.karma
 *   4. Append reputation_change_log entries (source=ADMIN_ADJUST)
 *
 * Run: node tools/migrate-punbb/migrate-reputation.js
 */
const fs = require('fs');
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const PUNBB_DB = {
  host: '127.0.0.1',
  port: 3306,
  // We read from exported TSV instead of connecting to MariaDB directly
};

const PG_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'tavrida_lot',
  user: 'postgres',
  password: 'postgres',
};

const USERS_MAP_PATH = '/tmp/users.json';
const REPUTATION_TSV = '/tmp/punbb_reputation.tsv';
const BATCH_SIZE = 500;

async function main() {
  // 1. Load user mapping (punbbUserId → logtoUserId)
  const rawUsers = JSON.parse(fs.readFileSync(USERS_MAP_PATH, 'utf8'));
  const punbbToLogto = {};
  for (const entry of Object.values(rawUsers)) {
    punbbToLogto[entry.punbbUserId] = entry.logtoUserId;
  }
  console.log(`User mapping: ${Object.keys(punbbToLogto).length} entries`);

  // 2. Parse reputation TSV
  const lines = fs.readFileSync(REPUTATION_TSV, 'utf8').trim().split('\n');
  console.log(`Reputation records: ${lines.length}`);

  // 3. Aggregate karma per target user
  const karmaMap = new Map(); // logtoUserId → { plus, minus, reasons: [{from, reason, time}] }

  let skipped = 0;
  for (const line of lines) {
    const [userIdStr, fromUserIdStr, repPlus, repMinus, reason, _postId, _topicId, timeStr] = line.split('\t');
    const targetPunbbId = parseInt(userIdStr, 10);
    const fromPunbbId = parseInt(fromUserIdStr, 10);
    const plus = parseInt(repPlus, 10) || 0;
    const minus = parseInt(repMinus, 10) || 0;

    const targetLogtoId = punbbToLogto[targetPunbbId];
    const fromLogtoId = punbbToLogto[fromPunbbId];
    if (!targetLogtoId) { skipped++; continue; }

    if (!karmaMap.has(targetLogtoId)) {
      karmaMap.set(targetLogtoId, { plus: 0, minus: 0, entries: [] });
    }
    const agg = karmaMap.get(targetLogtoId);
    agg.plus += plus;
    agg.minus += minus;

    // Store a sample of entries for the log (max 50 per user to avoid huge arrays)
    if (agg.entries.length < 50) {
      agg.entries.push({
        fromLogtoId: fromLogtoId || null,
        plus,
        minus,
        reason: reason || null,
        time: timeStr ? new Date(parseInt(timeStr, 10) * 1000).toISOString() : null,
      });
    }
  }

  console.log(`Users with karma: ${karmaMap.size}, skipped (no mapping): ${skipped}`);

  // 4. Connect to PostgreSQL
  const pg = new Client(PG_CONFIG);
  await pg.connect();
  console.log('Connected to PostgreSQL');

  try {
    let processed = 0;
    let updated = 0;

    for (const [logtoUserId, agg] of karmaMap) {
      const karmaDelta = agg.plus - agg.minus;
      if (karmaDelta === 0) continue;

      // Ensure user_rating row exists
      await pg.query(
        `INSERT INTO user_profile.user_rating (user_id, total_rating, karma, referral_karma, referral_rating, verified_sales, pending_sales)
         VALUES ($1, '0.00', '0.00', '0.00', '0.00', 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [logtoUserId],
      );

      // Update karma
      const res = await pg.query(
        `UPDATE user_profile.user_rating
         SET karma = (karma::numeric + $2)::varchar,
             updated_at = now()
         WHERE user_id = $1
         RETURNING karma`,
        [logtoUserId, karmaDelta],
      );
      const newKarma = res.rows[0]?.karma ?? '0';
      updated++;

      // Log entry: single aggregate entry
      const logId = randomUUID();
      await pg.query(
        `INSERT INTO user_profile.reputation_change_log
           (id, user_id, metric, delta, balance_after, source, actor_id, reference_id, note, created_at)
         VALUES ($1, $2, 'karma', $3, $4, 'ADMIN_ADJUST', NULL, NULL, $5, now())`,
        [
          logId,
          logtoUserId,
          karmaDelta,
          newKarma,
          `Перенос репутации со старого форума: +${agg.plus} / −${agg.minus}`,
        ],
      );

      processed++;
      if (processed % 100 === 0) {
        console.log(`  ${processed}/${karmaMap.size} users processed, ${updated} karma updated`);
      }
    }

    console.log(`\nDone! Processed: ${processed}, karma updated: ${updated}`);
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
