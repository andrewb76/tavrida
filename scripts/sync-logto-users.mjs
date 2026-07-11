#!/usr/bin/env node
/**
 * One-time backfill: sync all Logto users into user-profile.
 *
 * Usage: node scripts/sync-logto-users.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

const endpoint = process.env.LOGTO_ENDPOINT?.replace(/\/$/, '');
const clientId = process.env.LOGTO_M2M_APP_ID;
const clientSecret = process.env.LOGTO_M2M_APP_SECRET;
const profileUrl = (process.env.USER_PROFILE_URL ?? 'http://localhost:3007').replace(/\/$/, '');
const m2mResource =
  process.env.LOGTO_M2M_RESOURCE?.trim() ||
  (endpoint?.includes('.logto.app') ? `${endpoint}/api` : 'https://default.logto.app/api');

if (!endpoint || !clientId || !clientSecret) {
  console.error('Missing LOGTO M2M env vars');
  process.exit(1);
}

async function getM2MToken() {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    resource: m2mResource,
    scope: 'all',
  });
  const res = await fetch(`${endpoint}/oidc/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`M2M token failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function listLogtoUsers(token) {
  const res = await fetch(`${endpoint}/api/users?page=1&page_size=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`list users failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function syncUser(user) {
  const res = await fetch(`${profileUrl}/internal/v1/users/sync-logto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      name: user.name ?? null,
      username: user.username ?? null,
      primaryEmail: user.primaryEmail ?? null,
      primaryPhone: user.primaryPhone ?? null,
      avatar: user.avatar ?? null,
      isSuspended: user.isSuspended ?? false,
    }),
  });
  if (!res.ok) throw new Error(`sync ${user.id} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const token = await getM2MToken();
  const users = await listLogtoUsers(token);
  if (!Array.isArray(users) || users.length === 0) {
    console.log('No Logto users found');
    return;
  }

  for (const user of users) {
    await syncUser(user);
    console.log('Synced', user.id, user.name ?? user.username ?? user.primaryEmail ?? '');
  }

  console.log(`Done: ${users.length} users`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
