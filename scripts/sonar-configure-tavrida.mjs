#!/usr/bin/env node
/**
 * One-shot SonarCloud project setup for Tavrida Lot.
 *
 *   SONAR_TOKEN=… node scripts/sonar-configure-tavrida.mjs
 *
 * Or: token in .sonarcloud-token (gitignored) / .env.local SONAR_TOKEN=
 *
 * - Quality Gate "Tavrida": New Code ratings A, duplication ≤5%, no coverage gate
 * - Assign gate to project andrewb76_tavrida
 * - Long-lived branches regex includes `dev`
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ORG = process.env.SONAR_ORGANIZATION || 'andrewb76';
const PROJECT = process.env.SONAR_PROJECT_KEY || 'andrewb76_tavrida';
const HOST = (process.env.SONAR_HOST_URL || 'https://sonarcloud.io').replace(/\/$/, '');

function loadToken() {
  if (process.env.SONAR_TOKEN?.trim()) return process.env.SONAR_TOKEN.trim();
  const root = resolve(import.meta.dirname, '..');
  for (const rel of ['.sonarcloud-token', '.env.local']) {
    const p = resolve(root, rel);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    if (rel === '.sonarcloud-token') return text.trim();
    const m = text.match(/^SONAR_TOKEN=(.+)$/m);
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
  }
  throw new Error('SONAR_TOKEN not found (env / .sonarcloud-token / .env.local)');
}

async function api(token, method, path, form) {
  const url = `${HOST}${path}`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`,
  };
  let body;
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form).toString();
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function main() {
  const token = loadToken();

  const listed = await api(token, 'GET', `/api/qualitygates/list?organization=${ORG}`);
  let gate = (listed.qualitygates || []).find((g) => g.name === 'Tavrida');
  if (!gate) {
    const created = await api(token, 'POST', '/api/qualitygates/create', {
      organization: ORG,
      name: 'Tavrida',
    });
    gate = created;
    console.log('Created gate Tavrida', gate.id ?? gate);
  } else {
    console.log('Gate Tavrida exists', gate.id);
  }

  const show = await api(
    token,
    'GET',
    `/api/qualitygates/show?organization=${ORG}&id=${gate.id}`,
  );
  for (const c of show.conditions || []) {
    await api(token, 'POST', '/api/qualitygates/delete_condition', {
      organization: ORG,
      id: String(c.id),
    });
    console.log('Removed condition', c.metric);
  }

  const conditions = [
    ['new_reliability_rating', 'GT', '1'],
    ['new_security_rating', 'GT', '1'],
    ['new_maintainability_rating', 'GT', '1'],
    ['new_duplicated_lines_density', 'GT', '5'],
    ['new_security_hotspots_reviewed', 'LT', '100'],
  ];
  for (const [metric, op, error] of conditions) {
    await api(token, 'POST', '/api/qualitygates/create_condition', {
      organization: ORG,
      gateId: String(gate.id),
      metric,
      op,
      error,
    });
    console.log('Condition', metric, op, error);
  }

  await api(token, 'POST', '/api/qualitygates/select', {
    organization: ORG,
    projectKey: PROJECT,
    gateId: String(gate.id),
  });
  console.log('Assigned Tavrida gate to', PROJECT);

  await api(token, 'POST', '/api/settings/set', {
    component: PROJECT,
    key: 'sonar.branch.longLivedBranches.regex',
    value: '(branch|release)-.*|dev',
  });
  console.log('Long-lived branches regex includes dev');

  const verify = await api(
    token,
    'GET',
    `/api/qualitygates/get_by_project?organization=${ORG}&project=${PROJECT}`,
  );
  console.log('Project gate:', JSON.stringify(verify));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
