#!/usr/bin/env node
/**
 * Apply Tavrida branding to Logto sign-in experience + Account Center (OSS / Cloud).
 *
 * Console equivalent: Sign-in & account → Branding + Account center → Custom CSS
 *
 * Usage (from repo root, M2M in docker/swarm/dev.secrets.env or .env.local):
 *   LOGTO_ENDPOINT=https://auth.evatorg.su \
 *   LOGTO_M2M_APP_ID=… LOGTO_M2M_APP_SECRET=… \
 *   FRONTEND_ORIGIN=https://app.evatorg.su \
 *     pnpm setup:logto-branding
 *
 * Dry-run (print payload only):
 *   DRY_RUN=1 pnpm setup:logto-branding
 *
 * Verify public config (no M2M):
 *   VERIFY=1 pnpm setup:logto-branding
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SIGN_IN_CSS_PATH = resolve(ROOT, 'docker/config/logto/tavrida-sign-in.css');
const ACCOUNT_CENTER_CSS_PATH = resolve(ROOT, 'docker/config/logto/tavrida-account-center.css');

const TAVRIDA_PRIMARY = '#1F7A6E';
const TAVRIDA_PRIMARY_DARK = '#3D9B8E';
const LOGTO_DEFAULT_PRIMARY = '#6139F6';

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
loadEnvFile('docker/swarm/dev.secrets.env', { override: true });

/** Trim whitespace and accidental trailing slashes from pasted env values. */
function cleanEnvValue(value) {
  return value?.trim().replace(/\/+$/, '') ?? '';
}

const endpoint = cleanEnvValue(process.env.LOGTO_ENDPOINT);
const clientId = cleanEnvValue(process.env.LOGTO_M2M_APP_ID);
const clientSecret = cleanEnvValue(process.env.LOGTO_M2M_APP_SECRET);
const frontendOrigin = (
  process.env.FRONTEND_ORIGIN ||
  process.env.VITE_APP_ORIGIN ||
  'https://app.evatorg.su'
).replace(/\/$/, '');
const m2mResource =
  process.env.LOGTO_M2M_RESOURCE?.trim() ||
  (endpoint?.includes('.logto.app') ? `${endpoint}/api` : 'https://default.logto.app/api');
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const verifyOnly = process.env.VERIFY === '1' || process.env.VERIFY === 'true';

const signInCss = readFileSync(SIGN_IN_CSS_PATH, 'utf8');
const accountCenterCss = readFileSync(ACCOUNT_CENTER_CSS_PATH, 'utf8');
const logoUrl = `${frontendOrigin}/branding/logo-full-color-dark.svg`;
const faviconUrl = `${frontendOrigin}/branding/tavrida-mark.svg`;

/** @type {Record<string, unknown>} */
const signInBody = {
  color: {
    primaryColor: TAVRIDA_PRIMARY,
    isDarkModeEnabled: true,
    darkPrimaryColor: TAVRIDA_PRIMARY_DARK,
  },
  branding: {
    logoUrl,
    darkLogoUrl: logoUrl,
    favicon: faviconUrl,
    darkFavicon: faviconUrl,
  },
  hideLogtoBranding: true,
  customCss: signInCss,
};

async function fetchPublicSignInExp() {
  const res = await fetch(`${endpoint}/api/.well-known/sign-in-exp`);
  if (!res.ok) {
    throw new Error(`GET sign-in-exp well-known failed: ${res.status}`);
  }
  return res.json();
}

function printBrandingStatus(config) {
  const primary = config?.color?.primaryColor ?? '(missing)';
  const logo = config?.branding?.logoUrl ?? '(missing)';
  const cssLen = config?.customCss?.length ?? 0;
  const isDefault =
    String(primary).toLowerCase() === LOGTO_DEFAULT_PRIMARY.toLowerCase() ||
    String(logo).includes('logto.io/logo');

  console.log('Logto public sign-in experience:');
  console.log(`  primaryColor: ${primary}${isDefault ? '  ← default Logto (not branded)' : ''}`);
  console.log(`  logoUrl:      ${logo}`);
  console.log(`  customCss:    ${cssLen ? `${cssLen} bytes` : 'null'}`);
  return !isDefault && cssLen > 0;
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
    if (body.includes('invalid_client') && /\/$/.test(process.env.LOGTO_M2M_APP_ID ?? '')) {
      throw new Error(
        `M2M token failed: invalid_client — LOGTO_M2M_APP_ID ends with "/". Remove trailing slashes.`,
      );
    }
    throw new Error(`M2M token failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function patchSignInExp(token) {
  const res = await fetch(`${endpoint}/api/sign-in-exp`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signInBody),
  });

  if (!res.ok) {
    throw new Error(`PATCH /api/sign-in-exp failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function patchAccountCenterCss(token) {
  const getRes = await fetch(`${endpoint}/api/account-center`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (getRes.status === 404) {
    console.log('Account Center API not available (older Logto?) — sign-in branding still applied.');
    return null;
  }

  if (!getRes.ok) {
    throw new Error(`GET /api/account-center failed: ${getRes.status} ${await getRes.text()}`);
  }

  const current = await getRes.json();
  const patchRes = await fetch(`${endpoint}/api/account-center`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...current,
      customCss: accountCenterCss,
    }),
  });

  if (!patchRes.ok) {
    throw new Error(`PATCH /api/account-center failed: ${patchRes.status} ${await patchRes.text()}`);
  }

  return patchRes.json();
}

if (!endpoint) {
  console.error('Missing LOGTO_ENDPOINT');
  process.exit(1);
}

if (verifyOnly) {
  const ok = printBrandingStatus(await fetchPublicSignInExp());
  process.exit(ok ? 0 : 1);
}

if (!clientId || !clientSecret) {
  console.error('Missing LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET');
  console.error('Add to docker/swarm/dev.secrets.env, then: pnpm setup:logto-branding');
  process.exit(1);
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        endpoint,
        logoUrl,
        signInCssBytes: signInCss.length,
        accountCenterCssBytes: accountCenterCss.length,
        color: signInBody.color,
        branding: signInBody.branding,
        hideLogtoBranding: signInBody.hideLogtoBranding,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log('Current branding:');
printBrandingStatus(await fetchPublicSignInExp());

const token = await getM2MToken();
await patchSignInExp(token);
console.log('\nSign-in experience updated.');

try {
  await patchAccountCenterCss(token);
  console.log('Account Center custom CSS updated.');
} catch (err) {
  console.warn(`Account Center CSS skipped: ${err instanceof Error ? err.message : err}`);
}

console.log('\nAfter apply:');
const branded = printBrandingStatus(await fetchPublicSignInExp());

console.log('\nDetails:');
console.log(`  endpoint: ${endpoint}`);
console.log(`  logo:     ${logoUrl}`);
console.log(`  favicon:  ${faviconUrl}`);
console.log(`  sign-in css: ${SIGN_IN_CSS_PATH} (${signInCss.length} bytes)`);
console.log(`  account css: ${ACCOUNT_CENTER_CSS_PATH} (${accountCenterCss.length} bytes)`);

if (!branded) {
  console.warn('\nBranding may not have propagated yet — hard-refresh auth host or wait ~1 min.');
}

console.log('Preview: https://logto.evatorg.su → Sign-in & account → Branding → Live preview');
