import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(scriptDir, '..')
const contentDir = join(packageRoot, 'content')
const docsSource = join(packageRoot, '../../docs')

if (existsSync(contentDir)) {
  rmSync(contentDir, { recursive: true, force: true })
}

mkdirSync(contentDir, { recursive: true })
cpSync(docsSource, contentDir, { recursive: true })

// VitePress home page: index.md (README.md alone is not always picked up)
const readme = join(contentDir, 'README.md')
const index = join(contentDir, 'index.md')
if (existsSync(readme)) {
  copyFileSync(readme, index)
}

console.log('Synced docs → apps/docs-site/content')
