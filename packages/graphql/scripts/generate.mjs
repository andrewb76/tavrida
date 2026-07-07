import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '../src/generated');
const outFile = join(outDir, 'index.ts');

await mkdir(outDir, { recursive: true });
await writeFile(
  outFile,
  '// Placeholder — replace with GraphQL codegen output.\nexport {};\n',
);
console.log('graphql generate: wrote', outFile);
