import { readFileSync, existsSync } from 'node:fs';

export function hydrateSecretEnv(keys: string[] = []): void {
  const defaults = ['DB_PASSWORD', 'DATABASE_URL', ...keys];
  for (const key of defaults) {
    if (process.env[key]) continue;
    const filePath = process.env[`${key}_FILE`];
    if (!filePath || !existsSync(filePath)) continue;
    process.env[key] = readFileSync(filePath, 'utf8').trim();
  }
}

hydrateSecretEnv(['NOVU_API_KEY', 'NOVU_WEBHOOK_SECRET', 'REDIS_URL', 'RABBITMQ_URL']);
