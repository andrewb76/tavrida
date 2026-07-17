import { readFileSync } from 'node:fs';

/** Docker Swarm: `VAR_FILE` → `VAR` before Nest bootstrap. */
function hydrateSecretEnv(keys: readonly string[]): void {
  for (const key of keys) {
    if (process.env[key]?.trim()) continue;
    const filePath = process.env[`${key}_FILE`]?.trim();
    if (!filePath) continue;
    process.env[key] = readFileSync(filePath, 'utf8').trim();
  }
}

hydrateSecretEnv([
  'DATABASE_URL',
  'RABBITMQ_URL',
  'INTERNAL_SERVICE_TOKEN',
  'LOGTO_M2M_APP_SECRET',
  'MINIO_SECRET_KEY',
]);
