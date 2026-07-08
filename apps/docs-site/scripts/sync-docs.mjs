import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const contentDir = join(root, 'content')
const docsSource = join(root, '../../../docs')

if (existsSync(contentDir)) {
  rmSync(contentDir, { recursive: true, force: true })
}

mkdirSync(contentDir, { recursive: true })
cpSync(docsSource, contentDir, { recursive: true })
console.log('Synced docs → apps/docs-site/content')
