import { readFileSync } from 'node:fs';

/** Docker Swarm / K8s: map `VAR_FILE` → `VAR` before Nest bootstrap. */
export function hydrateSecretEnv(keys?: readonly string[]): void {
  const names =
    keys ??
    ([
      'DATABASE_URL',
      'RABBITMQ_URL',
      'LOGTO_M2M_APP_SECRET',
      'MINIO_SECRET_KEY',
      'MINIO_ACCESS_KEY',
    ] as const);

  for (const key of names) {
    if (process.env[key]?.trim()) continue;
    const filePath = process.env[`${key}_FILE`]?.trim();
    if (!filePath) continue;
    process.env[key] = readFileSync(filePath, 'utf8').trim();
  }
}
