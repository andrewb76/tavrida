#!/usr/bin/env node
/**
 * Configure Logto OSS file storage (MinIO) for avatar upload in Sign-in experience.
 *
 * 1. Ensures bucket `logto-avatars` exists (public read for uploaded URLs).
 * 2. Writes `storageProvider` into Logto DB (`systems` table).
 *
 * Swarm: bucket is also created by `minio-logto-init` in stack-infra.dev.yml.
 *
 * Usage (repo root, credentials in .env.local / docker/swarm/dev.secrets.env):
 *   DEV_DOMAIN=evatorg.su \
 *   MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=… \
 *   POSTGRES_PASSWORD=… \
 *   DOCKER_CONTEXT=dev-swarm \
 *     pnpm setup:logto-storage
 *
 * Dry-run:
 *   DRY_RUN=1 pnpm setup:logto-storage
 *
 * Skip MinIO bucket step (DB only, bucket already exists):
 *   SKIP_MINIO=1 pnpm setup:logto-storage
 *
 * @see https://docs.logto.io/logto-oss/file-storage-provider
 * @see docs/14-frontend/logto-setup.md
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const ROOT = resolve(import.meta.dirname, '..');

function loadEnvFile(name) {
  try {
    const text = readFileSync(resolve(ROOT, name), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');
loadEnvFile('docker/swarm/dev.env');
loadEnvFile('docker/swarm/dev.secrets.env');

const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const skipMinio = process.env.SKIP_MINIO === '1' || process.env.SKIP_MINIO === 'true';

const devDomain = process.env.DEV_DOMAIN?.trim() || 'evatorg.su';
const bucket = process.env.LOGTO_STORAGE_BUCKET?.trim() || 'logto-avatars';
const accessKeyId =
  process.env.MINIO_ACCESS_KEY?.trim() || process.env.MINIO_ROOT_USER?.trim() || 'minioadmin';
const secretAccessKey =
  process.env.MINIO_SECRET_KEY?.trim() || process.env.MINIO_ROOT_PASSWORD?.trim();

const internalEndpoint =
  process.env.LOGTO_STORAGE_INTERNAL_ENDPOINT?.trim() || 'http://minio:9000';
const publicUrl = (
  process.env.LOGTO_STORAGE_PUBLIC_URL?.trim() ||
  `https://s3.${devDomain}/${bucket}`
).replace(/\/$/, '');

/** Endpoint for this script to reach MinIO (laptop / CI — public S3 host). */
function minioClientEndpoint() {
  if (process.env.MINIO_URL?.trim()) {
    return process.env.MINIO_URL.trim().replace(/\/$/, '');
  }
  const host = process.env.MINIO_ENDPOINT?.trim();
  if (host?.startsWith('http')) return host.replace(/\/$/, '');
  if (host && host !== 'minio' && host !== 'localhost') {
    const ssl = process.env.MINIO_USE_SSL === 'true';
    const port = process.env.MINIO_PORT?.trim();
    const scheme = ssl ? 'https' : 'http';
    if (port && port !== '443' && port !== '80') return `${scheme}://${host}:${port}`;
    return `${scheme}://${host}`;
  }
  return `https://s3.${devDomain}`;
}

/** @returns {import('@aws-sdk/client-s3').S3Client} */
function createMinioClient() {
  return new S3Client({
    region: process.env.MINIO_REGION?.trim() || 'us-east-1',
    endpoint: minioClientEndpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey: secretAccessKey ?? '',
    },
  });
}

async function ensureLogtoAvatarsBucket(client) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`MinIO bucket exists: ${bucket}`);
  } catch {
    if (dryRun) {
      console.log(`[dry-run] would create bucket: ${bucket}`);
      return;
    }
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Created MinIO bucket: ${bucket}`);
  }

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };

  if (dryRun) {
    console.log('[dry-run] would set public read policy on bucket');
    return;
  }

  try {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy),
      }),
    );
    console.log(`Public read policy set on ${bucket}`);
  } catch (err) {
    console.warn(`Could not set bucket policy (set manually in MinIO Console): ${String(err)}`);
  }
}

function buildStorageProviderConfig() {
  if (!secretAccessKey) {
    throw new Error('Missing MINIO_SECRET_KEY or MINIO_ROOT_PASSWORD');
  }

  return {
    provider: 'S3Storage',
    endpoint: internalEndpoint,
    region: process.env.MINIO_REGION?.trim() || 'us-east-1',
    bucket,
    accessKeyId,
    accessSecretKey: secretAccessKey,
    forcePathStyle: true,
    publicUrl,
  };
}

function findDockerContainer(nameFragment) {
  const res = spawnSync(
    'docker',
    ['ps', '-q', '-f', `name=${nameFragment}`],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) return '';
  return res.stdout.trim().split('\n')[0] ?? '';
}

function applyStorageViaDockerPsql(config) {
  const json = JSON.stringify(config);
  const tag = `logto_storage_${Date.now()}`;
  const sql = `INSERT INTO systems (key, value) VALUES ('storageProvider', $${tag}$${json}$${tag}$::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`;

  if (dryRun) {
    console.log('[dry-run] would run SQL on logto DB (via docker postgres container)');
    console.log(sql);
    return;
  }

  const postgresContainer =
    process.env.DOCKER_POSTGRES_CONTAINER?.trim() || findDockerContainer('_postgres');
  if (!postgresContainer) {
    throw new Error(
      'Postgres container not found. Set DOCKER_POSTGRES_CONTAINER or run with DOCKER_CONTEXT=dev-swarm',
    );
  }

  const pgUser = process.env.POSTGRES_USER?.trim() || 'postgres';
  const pgPassword = process.env.POSTGRES_PASSWORD?.trim();
  if (!pgPassword) {
    throw new Error('Missing POSTGRES_PASSWORD for Logto DB update');
  }

  const res = spawnSync(
    'docker',
    [
      'exec',
      '-e',
      `PGPASSWORD=${pgPassword}`,
      postgresContainer,
      'psql',
      '-U',
      pgUser,
      '-d',
      'logto',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );

  if (res.status !== 0) {
    throw new Error(`psql failed: ${res.stderr || res.stdout}`);
  }

  console.log('Logto storageProvider updated in database.');
}

function maybeRestartLogto() {
  if (dryRun || process.env.RESTART_LOGTO === '0') return;

  const logtoService =
    process.env.DOCKER_LOGTO_SERVICE?.trim() || findDockerContainer('_logto');
  if (!logtoService) {
    console.log('Logto container not found — restart Logto manually if avatar upload fails.');
    return;
  }

  const stackService = process.env.LOGTO_SWARM_SERVICE?.trim();
  if (stackService) {
    const res = spawnSync('docker', ['service', 'update', '--force', stackService], {
      encoding: 'utf8',
      stdio: 'inherit',
    });
    if (res.status === 0) {
      console.log(`Restarted Swarm service: ${stackService}`);
    }
    return;
  }

  spawnSync('docker', ['restart', logtoService], { stdio: 'inherit' });
  console.log(`Restarted container: ${logtoService}`);
}

async function main() {
  if (!secretAccessKey && !dryRun) {
    console.error('Missing MINIO_SECRET_KEY or MINIO_ROOT_PASSWORD');
    process.exit(1);
  }

  const storageConfig = buildStorageProviderConfig();

  console.log('Logto storage provider (MinIO):');
  console.log(`  bucket:           ${bucket}`);
  console.log(`  internal endpoint ${internalEndpoint} (Logto → MinIO in Swarm network)`);
  console.log(`  public URL:       ${publicUrl}`);
  console.log(`  minio client:     ${minioClientEndpoint()} (this script)`);

  if (dryRun) {
    console.log('\n[dry-run] storageProvider JSON:');
    console.log(JSON.stringify(storageConfig, null, 2));
  }

  if (!skipMinio && !dryRun) {
    const client = createMinioClient();
    await ensureLogtoAvatarsBucket(client);
  } else if (skipMinio) {
    console.log('SKIP_MINIO=1 — bucket step skipped');
  }

  applyStorageViaDockerPsql(storageConfig);
  maybeRestartLogto();

  if (!dryRun) {
    console.log('\nNext steps:');
    console.log('  1. Logto Console → Sign-in experience → enable Avatar in profile / registration');
    console.log('  2. Test upload on sign-up or account settings');
    console.log(`  3. Public object URL pattern: ${publicUrl}/<key>`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
