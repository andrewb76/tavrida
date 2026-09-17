#!/usr/bin/env node
/**
 * Configure Logto sign-in / sign-up methods via Management API.
 *
 * Console equivalent: Sign-in & account → Sign-up and sign-in
 *
 * Usage (from repo root, M2M in docker/swarm/dev.secrets.env or .env.local):
 *   LOGTO_ENDPOINT=https://auth.tavridalot.ru \
 *   LOGTO_M2M_APP_ID=… LOGTO_M2M_APP_SECRET=… \
 *     node scripts/setup-logto-signin.mjs
 *
 * Options:
 *   --method=username   Username + Password (built-in, no SMTP)  [default]
 *   --method=email      Email + Password (requires SMTP connector)
 *   --method=phone      Phone + Password (requires SMS connector)
 *
 * Dry-run (print payload only):
 *   DRY_RUN=1 node scripts/setup-logto-signin.mjs
 *
 * Verify current config (no M2M):
 *   VERIFY=1 node scripts/setup-logto-signin.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
loadEnvFile('docker/swarm/dev.env', { override: true });
loadEnvFile('docker/swarm/dev.secrets.env', { override: true });

function cleanEnvValue(value) {
  return value?.trim().replace(/\/+$/, '') ?? '';
}

const endpoint = cleanEnvValue(process.env.LOGTO_ENDPOINT);
const clientId = cleanEnvValue(process.env.LOGTO_M2M_APP_ID);
const clientSecret = cleanEnvValue(process.env.LOGTO_M2M_APP_SECRET);
const m2mResource =
  process.env.LOGTO_M2M_RESOURCE?.trim() ||
  (endpoint?.includes('.logto.app') ? `${endpoint}/api` : 'https://default.logto.app/api');
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const verifyOnly = process.env.VERIFY === '1' || process.env.VERIFY === 'true';

const methodArg = process.argv.find((a) => a.startsWith('--method='));
const method = methodArg ? methodArg.split('=')[1] : 'username';

if (!['username', 'email', 'phone'].includes(method)) {
  console.error(`Unknown --method=${method}. Use: username, email, phone`);
  process.exit(1);
}

/** Build PATCH /api/sign-in-exp body based on chosen method. */
function buildSignInBody(signInMethod) {
  const body = { signUp: {}, signIn: {} };

  switch (signInMethod) {
    case 'username':
      body.signUp = {
        identifiers: ['username'],
        password: true,
        verify: false,
      };
      body.signIn = {
        methods: [
          {
            identifier: 'username',
            password: true,
            verificationCode: false,
            isPasswordPrimary: true,
          },
        ],
      };
      break;

    case 'email':
      body.signUp = {
        identifiers: ['email'],
        password: true,
        verify: true,
      };
      body.signIn = {
        methods: [
          {
            identifier: 'email',
            password: true,
            verificationCode: true,
            isPasswordPrimary: true,
          },
        ],
      };
      break;

    case 'phone':
      body.signUp = {
        identifiers: ['sms'],
        password: true,
        verify: true,
      };
      body.signIn = {
        methods: [
          {
            identifier: 'sms',
            password: true,
            verificationCode: true,
            isPasswordPrimary: true,
          },
        ],
      };
      break;
  }

  return body;
}

async function fetchPublicSignInExp() {
  const res = await fetch(`${endpoint}/api/.well-known/sign-in-exp`);
  if (!res.ok) {
    throw new Error(`GET sign-in-exp well-known failed: ${res.status}`);
  }
  return res.json();
}

function printCurrentConfig(config) {
  const signUp = config?.signUp;
  const signIn = config?.signIn;

  console.log('Current sign-in experience:');
  console.log(`  signUp.identifiers: ${JSON.stringify(signUp?.identifiers ?? [])}`);
  console.log(`  signUp.password:    ${signUp?.password ?? false}`);
  console.log(`  signUp.verify:      ${signUp?.verify ?? false}`);
  console.log(`  signIn.methods:     ${JSON.stringify(signIn?.methods ?? [])}`);

  const hasMethods = (signIn?.methods?.length ?? 0) > 0;
  const hasIdentifiers = (signUp?.identifiers?.length ?? 0) > 0;
  if (!hasMethods || !hasIdentifiers) {
    console.log('  ⚠  No sign-in methods configured — login form will be empty');
  } else {
    console.log('  ✓  Sign-in methods are configured');
  }
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
    const body = await res.text();
    if (body.includes('invalid_client')) {
      throw new Error(
        'M2M token failed: invalid_client — check LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET',
      );
    }
    throw new Error(`M2M token failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function patchSignInExp(token, body) {
  const res = await fetch(`${endpoint}/api/sign-in-exp`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH /api/sign-in-exp failed: ${res.status} ${text}`);
  }

  return res.json();
}

if (!endpoint) {
  console.error('Missing LOGTO_ENDPOINT');
  process.exit(1);
}

if (verifyOnly) {
  printCurrentConfig(await fetchPublicSignInExp());
  process.exit(0);
}

if (!clientId || !clientSecret) {
  console.error('Missing LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET');
  console.error('Add to docker/swarm/dev.secrets.env, then rerun.');
  process.exit(1);
}

const signInBody = buildSignInBody(method);

if (dryRun) {
  console.log(`Method: ${method}`);
  console.log('PATCH /api/sign-in-exp payload:');
  console.log(JSON.stringify(signInBody, null, 2));
  process.exit(0);
}

console.log(`Configuring sign-in method: ${method}`);
console.log('\nCurrent config:');
printCurrentConfig(await fetchPublicSignInExp());

const token = await getM2MToken();
await patchSignInExp(token, signInBody);
console.log('\n✓ Sign-in experience updated.');

console.log('\nAfter apply:');
printCurrentConfig(await fetchPublicSignInExp());
