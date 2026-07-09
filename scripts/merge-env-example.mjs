#!/usr/bin/env node
/**
 * Append keys from .env.example that are missing in .env.local.
 * Preserves existing values and comments in .env.local.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = resolve(root, '.env.example');
const localPath = resolve(root, '.env.local');

function parseKeys(content) {
  const keys = new Set();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    keys.add(trimmed.slice(0, eq).trim());
  }
  return keys;
}

function extractBlocks(content) {
  const blocks = [];
  let current = { comment: [], lines: [] };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') && !trimmed.includes('=')) {
      if (current.lines.length > 0) {
        blocks.push(current);
        current = { comment: [], lines: [] };
      }
      current.comment.push(line);
      continue;
    }
    if (!trimmed) {
      if (current.lines.length > 0) {
        blocks.push(current);
        current = { comment: [], lines: [] };
      }
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    current.lines.push(line);
  }
  if (current.lines.length > 0) blocks.push(current);
  return blocks;
}

if (!existsSync(examplePath)) {
  console.error('Missing .env.example');
  process.exit(1);
}

if (!existsSync(localPath)) {
  console.log('No .env.local — nothing to merge');
  process.exit(0);
}

const example = readFileSync(examplePath, 'utf8');
const local = readFileSync(localPath, 'utf8');
const localKeys = parseKeys(local);
const blocks = extractBlocks(example);

const missingBlocks = blocks.filter((block) =>
  block.lines.some((line) => {
    const key = line.trim().slice(0, line.trim().indexOf('=')).trim();
    return key && !localKeys.has(key);
  }),
);

if (missingBlocks.length === 0) {
  console.log('✓ .env.local is up to date with .env.example');
  process.exit(0);
}

const additions = missingBlocks
  .map((block) => {
    const header = block.comment.length ? `${block.comment.join('\n')}\n` : '';
    return `${header}${block.lines.join('\n')}`;
  })
  .join('\n\n');

const merged = `${local.trimEnd()}\n\n# --- Added from .env.example (merge-env) ---\n${additions}\n`;
writeFileSync(localPath, merged, 'utf8');

const addedKeys = missingBlocks.flatMap((block) =>
  block.lines.map((line) => line.trim().slice(0, line.trim().indexOf('=')).trim()),
);

console.log(`✓ Merged ${addedKeys.length} key(s) into .env.local:`);
for (const key of addedKeys) console.log(`  + ${key}`);
