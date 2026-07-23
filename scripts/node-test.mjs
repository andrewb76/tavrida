#!/usr/bin/env node
// Shared node:test runner: spec on stdout + JUnit XML at ./test-results/junit.xml
// Usage: node ../../scripts/node-test.mjs 'dist/**/*.test.js'
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const patterns = process.argv.slice(2).filter(Boolean);
if (!patterns.length) {
  console.error('usage: node-test.mjs <test-glob-or-file...>');
  process.exit(2);
}

mkdirSync('test-results', { recursive: true });

const args = [
  '--test',
  '--test-reporter=spec',
  '--test-reporter-destination=stdout',
  '--test-reporter=junit',
  '--test-reporter-destination=test-results/junit.xml',
  ...patterns,
];

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
