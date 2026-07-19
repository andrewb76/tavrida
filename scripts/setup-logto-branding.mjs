#!/usr/bin/env node
/**
 * Apply Tavrida branding to Logto sign-in experience (OSS / Cloud).
 *
 * Console equivalent: Sign-in & account → Branding
 *   - brand color (patina)
 *   - logo / favicon URLs
 *   - Custom CSS from docker/config/logto/tavrida-sign-in.css
 *
 * Usage (from repo root, with M2M in .env.local or env):
 *   LOGTO_ENDPOINT=https://auth.evatorg.su \
 *   LOGTO_M2M_APP_ID=… LOGTO_M2M_APP_SECRET=… \
 *   FRONTEND_ORIGIN=https://app.evatorg.su \
 *     pnpm setup:logto-branding
 *
 * Dry-run (print payload only):
 *   DRY_RUN=1 pnpm setup:logto-branding
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CSS_PATH = resolve(ROOT, 'docker/config/logto/tavrida-sign-in.css');

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

const endpoint = process.env.LOGTO_ENDPOINT?.replace(/\/$/, '');
const clientId = process.env.LOGTO_M2M_APP_ID;
const clientSecret = process.env.LOGTO_M2M_APP_SECRET;
const frontendOrigin = (
  process.env.FRONTEND_ORIGIN ||
  process.env.VITE_APP_ORIGIN ||
  'https://app.evatorg.su'
).replace(/\/$/, '');
const m2mResource =
  process.env.LOGTO_M2M_RESOURCE?.trim() ||
  (endpoint?.includes('.logto.app') ? `${endpoint}/api` : 'https://default.logto.app/api');
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!endpoint || !clientId || !clientSecret) {
  console.error('Missing LOGTO_ENDPOINT / LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET');
  process.exit(1);
}

const customCss = readFileSync(CSS_PATH, 'utf8');
const logoUrl = `${frontendOrigin}/branding/tavrida-wordmark.svg`;

/** @type {Record<string, unknown>} */
const brandingBody = {
  color: {
    primaryColor: '#1F7A6E',
    isDarkModeEnabled: true,
    darkPrimaryColor: '#3D9B8E',
  },
  branding: {
    logoUrl,
    darkLogoUrl: logoUrl,
    favicon: logoUrl,
    darkFavicon: logoUrl,
  },
  customCss,
};

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

async function patchSignInExp(token) {
  const res = await fetch(`${endpoint}/api/sign-in-exp`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(brandingBody),
  });

  if (!res.ok) {
    throw new Error(`PATCH /api/sign-in-exp failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        endpoint,
        logoUrl,
        customCssBytes: customCss.length,
        color: brandingBody.color,
        branding: brandingBody.branding,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const token = await getM2MToken();
await patchSignInExp(token);
console.log('Logto sign-in branding updated.');
console.log(`  endpoint: ${endpoint}`);
console.log(`  logo:     ${logoUrl}`);
console.log(`  css:      ${CSS_PATH} (${customCss.length} bytes)`);
console.log('Preview: open Live preview in Console → Branding, or sign in at the auth host.');
