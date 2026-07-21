#!/usr/bin/env node
/**
 * Configure Logto OSS file storage (MinIO) for avatar upload in Sign-in experience.
 *
 * 1. Ensures bucket `logto-avatars` exists (public read for uploaded URLs).
 * 2. Writes `storageProvider` into Logto DB (`systems` table).
 *
 * Swarm: buckets are created by `minio-buckets-init` in stack-infra.dev.yml.
 *
 * Usage (repo root, credentials in .env.local / docker/swarm/dev.secrets.env):
 *   # Laptop → remote Swarm:
 *   DOCKER_CONTEXT=dev-swarm pnpm setup:logto-storage
 *
 *   # On VPS (/opt/tavrida) — unset DOCKER_CONTEXT (local daemon):
 *   SKIP_MINIO=1 pnpm setup:logto-storage
 *
 *   DEV_DOMAIN=evatorg.su MINIO_ROOT_PASSWORD=… POSTGRES_PASSWORD=… …
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

function loadEnvFile(name, { override = false } = {}) {
  try {
    const text = readFileSync(resolve(ROOT, name), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (override || !(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');
loadEnvFile('docker/swarm/dev.env');
// Swarm secrets override local MinIO placeholders (minioadmin from .env.local).
loadEnvFile('docker/swarm/dev.secrets.env', { override: true });

const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const skipMinio = process.env.SKIP_MINIO === '1' || process.env.SKIP_MINIO === 'true';

const devDomain = process.env.DEV_DOMAIN?.trim() || 'evatorg.su';
const bucket = process.env.LOGTO_STORAGE_BUCKET?.trim() || 'logto-avatars';

const remoteDockerContext =
  Boolean(process.env.DOCKER_CONTEXT?.trim()) &&
  process.env.DOCKER_CONTEXT.trim() !== 'default';

function resolveMinioCredentials() {
  const rootUser = process.env.MINIO_ROOT_USER?.trim();
  const rootPassword = process.env.MINIO_ROOT_PASSWORD?.trim();
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();

  if (remoteDockerContext) {
    return {
      accessKeyId: rootUser || accessKey || 'minioadmin',
      secretAccessKey: rootPassword || secretKey,
    };
  }

  return {
    accessKeyId: accessKey || rootUser || 'minioadmin',
    secretAccessKey: secretKey || rootPassword,
  };
}

const { accessKeyId, secretAccessKey } = resolveMinioCredentials();

const stackName = process.env.STACK_NAME?.trim() || 'tavrida-dev';
const swarmNetwork =
  process.env.DOCKER_SWARM_NETWORK?.trim() ||
  process.env.TRAEFIK_SWARM_NETWORK?.trim() ||
  `${stackName}_tavrida_net`;

const internalEndpoint =
  process.env.LOGTO_STORAGE_INTERNAL_ENDPOINT?.trim() || 'http://minio:9000';
const publicUrl = (
  process.env.LOGTO_STORAGE_PUBLIC_URL?.trim() ||
  `https://s3.${devDomain}/${bucket}`
).replace(/\/$/, '');

/** True when MINIO_* from .env.local points at local dev stack, not reachable remotely. */
function isLocalMinioTarget(value) {
  if (!value) return false;
  const v = value.toLowerCase();
  return (
    v.includes('localhost') ||
    v.includes('127.0.0.1') ||
    v.includes('://minio:') ||
    v.includes('://minio/') ||
    v === 'minio'
  );
}

/** Endpoint for this script to reach MinIO (laptop → public S3; on VPS → localhost). */
function minioClientEndpoint() {
  if (process.env.LOGTO_STORAGE_CLIENT_ENDPOINT?.trim()) {
    return process.env.LOGTO_STORAGE_CLIENT_ENDPOINT.trim().replace(/\/$/, '');
  }

  const minioUrl = process.env.MINIO_URL?.trim();
  const minioHost = process.env.MINIO_ENDPOINT?.trim();

  if (!remoteDockerContext) {
    if (minioUrl) return minioUrl.replace(/\/$/, '');
    if (minioHost?.startsWith('http')) return minioHost.replace(/\/$/, '');
    if (minioHost && !isLocalMinioTarget(minioHost)) {
      const ssl = process.env.MINIO_USE_SSL === 'true';
      const port = process.env.MINIO_PORT?.trim();
      const scheme = ssl ? 'https' : 'http';
      if (port && port !== '443' && port !== '80') return `${scheme}://${minioHost}:${port}`;
      return `${scheme}://${minioHost}`;
    }
  } else if (minioUrl && !isLocalMinioTarget(minioUrl)) {
    return minioUrl.replace(/\/$/, '');
  } else if (minioHost && !isLocalMinioTarget(minioHost)) {
    if (minioHost.startsWith('http')) return minioHost.replace(/\/$/, '');
    const ssl = process.env.MINIO_USE_SSL === 'true' || minioHost.includes('.');
    const scheme = ssl ? 'https' : 'http';
    const port = process.env.MINIO_PORT?.trim();
    if (port && port !== '443' && port !== '80') return `${scheme}://${minioHost}:${port}`;
    return `${scheme}://${minioHost}`;
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

function dockerArgs(extra = []) {
  const ctx = process.env.DOCKER_CONTEXT?.trim();
  if (ctx && ctx !== 'default') return ['--context', ctx, ...extra];
  return extra;
}

function runDocker(args, options = {}) {
  return spawnSync('docker', dockerArgs(args), options);
}

function assertDockerReachable() {
  const res = runDocker(['info', '--format', '{{.Name}}'], { encoding: 'utf8', stdio: 'pipe' });
  if (res.status !== 0) {
    const hint = remoteDockerContext
      ? 'Check DOCKER_CONTEXT=dev-swarm on your laptop. On the VPS itself, unset DOCKER_CONTEXT.'
      : 'Ensure Docker daemon is running and you have permission to use it.';
    throw new Error(`docker not reachable: ${(res.stderr || res.stdout || '').trim()}\n${hint}`);
  }
}

function findPostgresContainer() {
  const explicit = process.env.DOCKER_POSTGRES_CONTAINER?.trim();
  if (explicit) return explicit;

  for (const fragment of [`${stackName}_postgres`, '_postgres']) {
    const res = runDocker(['ps', '-q', '-f', `name=${fragment}`, '-f', 'status=running'], {
      encoding: 'utf8',
    });
    if (res.status !== 0) continue;
    const id = res.stdout.trim().split('\n').find(Boolean);
    if (id) return id;
  }
  return '';
}

function applyStorageViaDockerPsql(config) {
  const json = JSON.stringify(config);
  const tag = `logto_storage_${Date.now()}`;
  const sql = `INSERT INTO systems (key, value) VALUES ('storageProvider', $${tag}$${json}$${tag}$::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`;

  if (dryRun) {
    console.log('[dry-run] would run SQL on logto DB (postgres exec or ephemeral psql on swarm network)');
    console.log(sql);
    return;
  }

  assertDockerReachable();

  const pgUser = process.env.POSTGRES_USER?.trim() || 'postgres';
  const pgPassword = process.env.POSTGRES_PASSWORD?.trim();
  if (!pgPassword) {
    throw new Error('Missing POSTGRES_PASSWORD for Logto DB update');
  }

  const postgresContainer = findPostgresContainer();
  const psqlBase = ['psql', '-U', pgUser, '-d', 'logto', '-v', 'ON_ERROR_STOP=1', '-c', sql];

  let res;
  if (postgresContainer) {
    console.log(`Logto DB update via postgres task ${postgresContainer.slice(0, 12)}…`);
    res = runDocker(
      ['exec', '-e', `PGPASSWORD=${pgPassword}`, postgresContainer, ...psqlBase],
      { encoding: 'utf8', stdio: 'pipe' },
    );
  } else {
    const pgHost = process.env.POSTGRES_HOST?.trim() || 'postgres';
    console.log(`Logto DB update via ephemeral psql on ${swarmNetwork} → ${pgHost}`);
    res = runDocker(
      [
        'run',
        '--rm',
        '--network',
        swarmNetwork,
        '-e',
        `PGPASSWORD=${pgPassword}`,
        'postgres:17-alpine',
        ...psqlBase.slice(0, 1),
        '-h',
        pgHost,
        ...psqlBase.slice(1),
      ],
      { encoding: 'utf8', stdio: 'pipe' },
    );
  }

  if (res.status !== 0) {
    throw new Error(`psql failed: ${res.stderr || res.stdout}`);
  }

  console.log('Logto storageProvider updated in database.');
}

function maybeRestartLogto() {
  if (dryRun || process.env.RESTART_LOGTO === '0') return;

  const stackService = process.env.LOGTO_SWARM_SERVICE?.trim();
  if (stackService) {
    const res = runDocker(['service', 'update', '--force', stackService], {
      encoding: 'utf8',
      stdio: 'inherit',
    });
    if (res.status === 0) {
      console.log(`Restarted Swarm service: ${stackService}`);
    }
    return;
  }

  const logtoRes = runDocker(['ps', '-q', '-f', 'name=_logto', '-f', 'status=running'], {
    encoding: 'utf8',
  });
  const logtoContainer = logtoRes.stdout?.trim().split('\n').find(Boolean);
  if (!logtoContainer) {
    console.log('Logto container not found — restart Logto manually if avatar upload fails.');
    return;
  }

  runDocker(['restart', logtoContainer], { stdio: 'inherit' });
  console.log(`Restarted container: ${logtoContainer}`);
}

async function main() {
  if (!secretAccessKey && !dryRun) {
    console.error('Missing MINIO_SECRET_KEY or MINIO_ROOT_PASSWORD');
    process.exit(1);
  }

  if (
    remoteDockerContext &&
    !dryRun &&
    !skipMinio &&
    secretAccessKey === 'minioadmin' &&
    !process.env.MINIO_ROOT_PASSWORD?.trim()
  ) {
    console.error(
      'Remote Swarm (DOCKER_CONTEXT=dev-swarm) but MinIO password looks like local placeholder.\n' +
        'Create docker/swarm/dev.secrets.env from dev.secrets.env.example with real MINIO_ROOT_PASSWORD,\n' +
        'or pass MINIO_ROOT_PASSWORD=… inline. If bucket exists from minio-buckets-init: SKIP_MINIO=1',
    );
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
