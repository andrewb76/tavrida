import { readFileSync } from 'node:fs';

function hydrateSecretEnv(keys: readonly string[]): void {
  for (const key of keys) {
    if (process.env[key]?.trim()) continue;
    const filePath = process.env[`${key}_FILE`]?.trim();
    if (!filePath) continue;
    process.env[key] = readFileSync(filePath, 'utf8').trim();
  }
}

hydrateSecretEnv(['REDIS_URL', 'INFLUXDB_TOKEN', 'INTERNAL_SERVICE_TOKEN']);
