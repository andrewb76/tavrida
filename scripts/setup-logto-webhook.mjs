#!/usr/bin/env node
/**
 * Create or update Logto webhook for user-profile sync.
 *
 * Usage:
 *   LOGTO_WEBHOOK_ENDPOINT_URL=https://<public-bff>/api/v1/webhooks/logto \
 *     node scripts/setup-logto-webhook.mjs
 *
 * Requires LOGTO_ENDPOINT, LOGTO_M2M_APP_ID, LOGTO_M2M_APP_SECRET in .env.local
 * Prints signing key → add to LOGTO_WEBHOOK_SIGNING_KEY
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
const webhookUrl = process.env.LOGTO_WEBHOOK_ENDPOINT_URL;
const m2mResource =
  process.env.LOGTO_M2M_RESOURCE?.trim() ||
  (endpoint?.includes('.logto.app') ? `${endpoint}/api` : 'https://default.logto.app/api');

const EVENTS = [
  'User.Created',
  'PostRegister',
  'User.Data.Updated',
  'User.Deleted',
  'User.SuspensionStatus.Updated',
];

if (!endpoint || !clientId || !clientSecret) {
  console.error('Missing LOGTO_ENDPOINT / LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET');
  process.exit(1);
}

if (!webhookUrl) {
  console.error('Set LOGTO_WEBHOOK_ENDPOINT_URL (public URL of BFF /api/v1/webhooks/logto)');
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

  if (!res.ok) {
    throw new Error(`M2M token failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function listHooks(token) {
  const res = await fetch(`${endpoint}/api/hooks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`list hooks failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createHook(token) {
  const res = await fetch(`${endpoint}/api/hooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Tavrida user-profile sync',
      events: EVENTS,
      config: { url: webhookUrl },
      enabled: true,
    }),
  });

  if (!res.ok) throw new Error(`create hook failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const token = await getM2MToken();
  const hooks = await listHooks(token);
  const existing = Array.isArray(hooks)
    ? hooks.find((hook) => hook.config?.url === webhookUrl)
    : null;

  if (existing) {
    console.log('Webhook already exists:', existing.id);
    console.log('Signing key:', existing.signingKey);
    console.log('Add to .env.local: LOGTO_WEBHOOK_SIGNING_KEY=' + existing.signingKey);
    return;
  }

  const created = await createHook(token);
  console.log('Webhook created:', created.id);
  console.log('Endpoint:', webhookUrl);
  console.log('Events:', EVENTS.join(', '));
  console.log('');
  console.log('Add to .env.local:');
  console.log(`LOGTO_WEBHOOK_SIGNING_KEY=${created.signingKey}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
