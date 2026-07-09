import { defineConfig } from 'vitepress'
import { generatedSidebar } from './sidebar.generated'

const repoBase = process.env.VITEPRESS_BASE ?? '/'

export default defineConfig({
  title: 'Tavrida Lot',
  description: 'Документация платформы Tavrida Lot',
  lang: 'ru-RU',
  srcDir: 'content',
  base: repoBase,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  vite: {
    ssr: {
      noExternal: ['vue'],
    },
  },
  themeConfig: {
    nav: [
      { text: 'Для людей', link: '/01-goal/platform-for-users' },
      { text: 'Screen tree', link: '/11-ux-ui/screen-tree' },
      { text: 'Архитектура', link: '/03-architecture/README' },
      { text: 'Микросервисы', link: '/05-microservices/README' },
      { text: 'ADR', link: '/03-architecture/adr/README' },
      {
        text: 'GitHub',
        link: 'https://github.com/andrewb76/tavrida',
      },
    ],
    sidebar: generatedSidebar,
    search: {
      provider: 'local',
    },
  },
})
