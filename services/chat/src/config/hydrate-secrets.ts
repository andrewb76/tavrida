import { readFileSync, existsSync } from 'node:fs';

/**
 * Swarm: VAR_FILE → VAR. Local: no-op if files missing.
 */
export function hydrateSecretEnv(keys: string[] = []): void {
  const defaults = [
    'DB_PASSWORD',
    'DATABASE_URL',
    'INTERNAL_SERVICE_TOKEN',
    'RABBITMQ_URL',
    ...keys,
  ];
  for (const key of defaults) {
    if (process.env[key]) continue;
    const fileVar = `${key}_FILE`;
    const filePath = process.env[fileVar];
    if (!filePath || !existsSync(filePath)) continue;
    process.env[key] = readFileSync(filePath, 'utf8').trim();
  }
}

hydrateSecretEnv();
