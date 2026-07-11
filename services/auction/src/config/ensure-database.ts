import { Client } from 'pg';

const SCHEMA = 'auction';

function connectionConfig() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return { connectionString: url };

  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'tavrida_lot',
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
