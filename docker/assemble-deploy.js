#!/usr/bin/env node
// Assemble /deploy: install external deps + copy workspace package artifacts.
// Called by Dockerfile.service after pnpm build + copy dist/package.json.
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const wsDirs = fs.readdirSync('/repo/packages', { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join('/repo/packages', d.name));
const wsPkgs = new Map();
for (const dir of wsDirs) {
  const pj = path.join(dir, 'package.json');
  if (fs.existsSync(pj)) {
    const p = JSON.parse(fs.readFileSync(pj, 'utf8'));
    wsPkgs.set(p.name, { dir, deps: p.dependencies || {} });
  }
}
const wsNames = new Set(wsPkgs.keys());

const allDeps = {};
const add = (deps) => { for (const [n, v] of Object.entries(deps || {})) if (!wsNames.has(n) && !allDeps[n]) allDeps[n] = v; };
add(pkg.dependencies);
for (const [, info] of wsPkgs) add(info.deps);

fs.writeFileSync('package.json', JSON.stringify({ name: pkg.name, version: '0.0.0', private: true, dependencies: allDeps }, null, 2));
console.log('Installing', Object.keys(allDeps).length, 'external deps');

// After npm install (external), copy workspace package dist + package.json.
// Also copy their local node_modules (resolved deps like @hawk.so/nodejs).
for (const dir of wsDirs) {
  const pj = path.join(dir, 'package.json');
  if (!fs.existsSync(pj)) continue;
  const name = JSON.parse(fs.readFileSync(pj, 'utf8')).name;
  const dest = path.join('node_modules', name);
  fs.mkdirSync(dest, { recursive: true });
  const dist = path.join(dir, 'dist');
  if (fs.existsSync(dist)) fs.cpSync(dist, path.join(dest, 'dist'), { recursive: true });
  fs.copyFileSync(pj, path.join(dest, 'package.json'));
  // Copy workspace package's own node_modules (symlinks resolved by fs.cpSync).
  const wsNm = path.join(dir, 'node_modules');
  if (fs.existsSync(wsNm)) {
    for (const entry of fs.readdirSync(wsNm, { withFileTypes: true })) {
      if (entry.name === '.bin') continue;
      const src = path.join(wsNm, entry.name);
      const tgt = path.join(dest, 'node_modules', entry.name);
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        try { fs.cpSync(src, tgt, { recursive: true, dereference: true }); } catch {}
      }
    }
  }
  console.log('copied', name);
}
