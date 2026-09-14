import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const SCHEMA = 'settings';

function loadLocalEnv(): Record<string, string> {
  try {
    const envPath = resolve(__dirname, '../../.env');
    const content = readFileSync(envPath, 'utf8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      result[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
    return result;
  } catch {
    return {};
  }
}

function connectionConfig() {
  const localEnv = loadLocalEnv();
  const getUrl = () => process.env.DATABASE_URL?.trim() || localEnv.DATABASE_URL?.trim();
  const url = getUrl();
  if (url) return { connectionString: url };
  return {
    host: process.env.DB_HOST || localEnv.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || localEnv.DB_PORT || 5432),
    user: process.env.DB_USER || localEnv.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || localEnv.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || localEnv.DB_NAME || 'tavrida_lot',
  };
}

export async function ensureDatabaseSchema(): Promise<void> {
  const client = new Client(connectionConfig());
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  } finally {
    await client.end();
  }
}
