/**
 * Generate SQL for migrating PunBB reputation → user_profile.karma
 * Outputs SQL to stdout, pipe through psql on the server.
 *
 * Run locally, pipe to server:
 *   node tools/migrate-punbb/gen-reputation-sql.js | ssh max "docker exec -i tavrida-dev_postgres.1.* psql -U postgres -d tavrida_lot"
 */
const fs = require('fs');
const crypto = require('crypto');

const rawUsers = JSON.parse(fs.readFileSync('/tmp/users.json', 'utf8'));
const punbbToLogto = {};
for (const entry of Object.values(rawUsers)) {
  punbbToLogto[entry.punbbUserId] = entry.logtoUserId;
}

const lines = fs.readFileSync('/tmp/punbb_reputation.tsv', 'utf8').trim().split('\n');

const karmaMap = new Map();
let skipped = 0;

for (const line of lines) {
  const parts = line.split('\t');
  const targetPunbbId = parseInt(parts[0], 10);
  const plus = parseInt(parts[2], 10) || 0;
  const minus = parseInt(parts[3], 10) || 0;
  const targetLogtoId = punbbToLogto[targetPunbbId];
  if (!targetLogtoId) { skipped++; continue; }
  if (!karmaMap.has(targetLogtoId)) {
    karmaMap.set(targetLogtoId, { plus: 0, minus: 0 });
  }
  const agg = karmaMap.get(targetLogtoId);
  agg.plus += plus;
  agg.minus += minus;
}

const esc = (s) => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;

// Output SQL
const sql = [];
sql.push('BEGIN;');
sql.push(`CREATE TEMP TABLE _rep_import (user_id varchar(128), delta numeric);`);

for (const [logtoUserId, agg] of karmaMap) {
  const delta = agg.plus - agg.minus;
  if (delta === 0) continue;
  const note = `Перенос репутации со старого форума: +${agg.plus} / \u2212${agg.minus}`;
  sql.push(`INSERT INTO _rep_import VALUES (${esc(logtoUserId)}, ${delta});`);
}

sql.push('');
sql.push('-- Upsert user_rating rows');
sql.push(`INSERT INTO user_profile.user_rating (user_id, total_rating, karma, referral_karma, referral_rating, verified_sales, pending_sales)
  SELECT user_id, 0, 0, 0, 0, 0, 0 FROM _rep_import
  ON CONFLICT (user_id) DO NOTHING;`);

sql.push('');
sql.push('-- Update karma');
sql.push(`UPDATE user_profile.user_rating ur
  SET karma = ur.karma + ri.delta,
      updated_at = now()
  FROM _rep_import ri
  WHERE ur.user_id = ri.user_id;`);

sql.push('');
sql.push('-- Insert reputation_change_log entries');
sql.push(`INSERT INTO user_profile.reputation_change_log
  (id, user_id, metric, delta, balance_after, source, actor_id, reference_id, note, created_at)
  SELECT
    gen_random_uuid(),
    ri.user_id,
    'karma',
    ri.delta,
    ur.karma::numeric,
    'ADMIN_ADJUST',
    NULL,
    NULL,
    'Перенос репутации со старого форума',
    now()
  FROM _rep_import ri
  JOIN user_profile.user_rating ur ON ur.user_id = ri.user_id;`);

sql.push('');
sql.push('DROP TABLE _rep_import;');
sql.push('COMMIT;');

process.stdout.write(sql.join('\n') + '\n');
