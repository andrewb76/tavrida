#!/usr/bin/env node
/**
 * Validates Logto + frontend env before dev.
 * Usage: node scripts/check-logto-env.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

function parseEnv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnv() {
  if (!existsSync(envPath)) {
    return { env: {}, path: envPath, exists: false };
  }
  return {
    env: parseEnv(readFileSync(envPath, 'utf8')),
    path: envPath,
    exists: true,
  };
}

const { env, path, exists } = loadEnv();
const endpoint = env.VITE_LOGTO_ENDPOINT?.trim();
const appId = env.VITE_LOGTO_APP_ID?.trim();
const logtoConfigured = Boolean(endpoint && appId);

console.log('Tavrida Lot — frontend / Logto env check\n');

if (!exists) {
  console.log(`⚠  ${path} not found`);
  console.log('   Run: pnpm setup:env');
  console.log('   Dev mode: mock auth (no Logto)\n');
  process.exit(0);
}

console.log(`✓  ${path}`);

if (logtoConfigured) {
  console.log(`✓  Logto endpoint: ${endpoint}`);
  console.log(`✓  Logto app id:   ${appId.slice(0, 8)}…`);
  if (env.VITE_LOGTO_API_RESOURCE?.trim()) {
    const resource = env.VITE_LOGTO_API_RESOURCE.trim();
    console.log(`✓  API resource:   ${resource}`);
    const audience = env.LOGTO_AUDIENCE?.trim();
    if (audience && audience !== resource) {
      console.log(`✗  LOGTO_AUDIENCE (${audience}) ≠ VITE_LOGTO_API_RESOURCE`);
      console.log('   BFF will reject access tokens with audience mismatch.');
      process.exitCode = 1;
    } else if (audience) {
      console.log('✓  LOGTO_AUDIENCE matches VITE_LOGTO_API_RESOURCE');
    } else {
      console.log('⚠  LOGTO_AUDIENCE not set — BFF cannot validate API tokens');
    }
  } else {
    console.log('ℹ  VITE_LOGTO_API_RESOURCE not set');
    console.log('   Without it the SPA sends an ID token; BFF JWKS mode expects API aud.');
  }
  console.log('\nRedirect URIs to register in Logto Console:');
  console.log('  Sign-in:  http://localhost:5173/callback');
  console.log('  Sign-out: http://localhost:5173/');
  console.log('  CORS:     http://localhost:5173');
} else {
  console.log('ℹ  Logto not configured — using dev/mock auth');
  console.log('   Uncomment VITE_LOGTO_ENDPOINT + VITE_LOGTO_APP_ID in .env.local');
}

const m2mId = env.LOGTO_M2M_APP_ID?.trim();
const m2mSecret = env.LOGTO_M2M_APP_SECRET?.trim();
const m2mConfigured = Boolean(m2mId && m2mSecret);

console.log(`\nMock API: ${env.VITE_USE_MOCK !== 'false' ? 'on' : 'off'}`);
console.log(`API base: ${env.VITE_API_BASE_URL ?? '(default /api/v1)'}`);

if (m2mConfigured) {
  console.log(`✓  Logto M2M:      ${m2mId.slice(0, 8)}…`);
} else {
  console.log('ℹ  LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET not set (needed for BFF invites)');
}
