/**
 * Builds VitePress sidebar from apps/docs-site/content/ (after sync-docs).
 * Run: node scripts/generate-sidebar.mjs
 */
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(scriptDir, '..')
const contentDir = join(packageRoot, 'content')
const outFile = join(packageRoot, '.vitepress/sidebar.generated.ts')

/** Shortcuts at the top (existence-checked at generation time). */
const PINNED_START = [
  { text: 'Оглавление', link: '/' },
  { text: 'PROJECT-CONTEXT', link: '/00-meta/PROJECT-CONTEXT' },
  { text: 'DOCS-ROADMAP', link: '/00-meta/DOCS-ROADMAP' },
  { text: 'platform-for-users', link: '/01-goal/platform-for-users' },
  { text: 'club-access', link: '/01-goal/club-access' },
  { text: 'karma-and-rating', link: '/01-goal/karma-and-rating' },
  { text: 'roles', link: '/01-goal/roles' },
  { text: 'platform-scenarios', link: '/01-goal/platform-scenarios' },
  { text: 'Screen tree (UX)', link: '/11-ux-ui/screen-tree' },
]

const SECTION_LABELS = {
  '00-meta': '00 · Meta',
  '01-goal': '01 · Цель',
  '02-infrastructure': '02 · Инфраструктура',
  '03-architecture': '03 · Архитектура',
  '04-deployment': '04 · Деплой',
  '05-microservices': '05 · Микросервисы',
  '06-api': '06 · API',
  '07-observability': '07 · Observability',
  '08-testing': '08 · Testing',
  '09-security': '09 · Security',
  '10-data': '10 · Data',
  '11-ux-ui': '11 · UX/UI',
  '12-dev-process': '12 · Dev process',
  '13-maintenance': '13 · Maintenance',
  '14-frontend': '14 · Frontend',
}

/** Prefer these .md files first within a section (UX landing pages). */
const SECTION_FILE_PRIORITY = {
  '11-ux-ui': ['README.md', 'screen-tree.md', 'information-architecture.md', 'design-tokens.md'],
}

function contentLink(relativePath) {
  const withoutExt = relativePath.replace(/\.md$/, '')
  if (withoutExt.endsWith('/README') || withoutExt === 'README') {
    const parts = withoutExt.split('/').filter((p) => p !== 'README')
    return parts.length ? `/${parts.join('/')}/README` : '/'
  }
  return `/${withoutExt}`
}

function listMdFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => {
      if (a === 'README.md') return -1
      if (b === 'README.md') return 1
      return a.localeCompare(b, 'ru')
    })
}

function listSubdirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => {
      const full = join(dir, name)
      return statSync(full).isDirectory()
    })
    .sort((a, b) => a.localeCompare(b, 'ru'))
}

function displayName(filename) {
  return filename.replace(/\.md$/, '')
}

function sortMdFiles(dir, urlParts, files) {
  const sectionKey = urlParts[0]
  const priority = SECTION_FILE_PRIORITY[sectionKey]
  if (!priority) return files
  return [...files].sort((a, b) => {
    const ai = priority.indexOf(a)
    const bi = priority.indexOf(b)
    if (ai === -1 && bi === -1) {
      if (a === 'README.md') return -1
      if (b === 'README.md') return 1
      return a.localeCompare(b, 'ru')
    }
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

/** Single leaf: subdir with only README.md and no nested dirs. */
function isReadmeOnlyLeaf(dir) {
  const subdirs = listSubdirs(dir)
  if (subdirs.length > 0) return false
  const mds = listMdFiles(dir)
  return mds.length === 1 && mds[0] === 'README.md'
}

function buildDirItems(dir, urlParts = []) {
  const items = []
  const mds = sortMdFiles(dir, urlParts, listMdFiles(dir))

  for (const file of mds) {
    const name = displayName(file)
    const text = file === 'README.md' ? 'README' : name
    items.push({
      text,
      link: contentLink([...urlParts, file === 'README.md' ? 'README.md' : file].join('/')),
    })
  }

  for (const sub of listSubdirs(dir)) {
    const subDir = join(dir, sub)
    const subParts = [...urlParts, sub]

    if (isReadmeOnlyLeaf(subDir)) {
      items.push({
        text: sub,
        link: contentLink([...subParts, 'README.md'].join('/')),
      })
    } else {
      const nested = buildDirItems(subDir, subParts)
      if (nested.length > 0) {
        items.push({
          text: sub,
          collapsed: true,
          items: nested,
        })
      }
    }
  }

  return items
}

function sectionTitle(dirName) {
  return SECTION_LABELS[dirName] ?? dirName
}

function pinnedItems() {
  return PINNED_START.filter(({ link }) => {
    if (link === '/') {
      return existsSync(join(contentDir, 'index.md')) || existsSync(join(contentDir, 'README.md'))
    }
    const path = link.slice(1)
    const md = join(contentDir, `${path}.md`)
    const readme = join(contentDir, path, 'README.md')
    return existsSync(md) || existsSync(readme)
  })
}

function buildSidebar() {
  if (!existsSync(contentDir)) {
    throw new Error(`content/ not found — run sync-docs.mjs first (${contentDir})`)
  }

  const sidebar = []

  const pinned = pinnedItems()
  if (pinned.length > 0) {
    sidebar.push({
      text: 'Старт',
      items: pinned,
    })
  }

  const sections = readdirSync(contentDir)
    .filter((name) => /^\d{2}-/.test(name))
    .filter((name) => statSync(join(contentDir, name)).isDirectory())
    .sort()

  for (const dirName of sections) {
    const dir = join(contentDir, dirName)
    const items = buildDirItems(dir, [dirName])
    if (items.length === 0) continue

    sidebar.push({
      text: sectionTitle(dirName),
      collapsed: true,
      items,
    })
  }

  return sidebar
}

const sidebar = buildSidebar()

const output = `// Generated by scripts/generate-sidebar.mjs — do not edit
import type { DefaultTheme } from 'vitepress'

export const generatedSidebar: DefaultTheme.SidebarItem[] = ${JSON.stringify(sidebar, null, 2)}
`

writeFileSync(outFile, output, 'utf8')
console.log(`Generated sidebar → .vitepress/sidebar.generated.ts (${sidebar.length} sections)`)
