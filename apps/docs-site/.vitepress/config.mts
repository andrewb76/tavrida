import { defineConfig } from 'vitepress'

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
      { text: 'Архитектура', link: '/03-architecture/README' },
      { text: 'Микросервисы', link: '/05-microservices/README' },
      { text: 'ADR', link: '/03-architecture/adr/README' },
      {
        text: 'GitHub',
        link: 'https://github.com/andrewb76/tavrida',
      },
    ],
    sidebar: [
      {
        text: 'Старт',
        items: [
          { text: 'Оглавление', link: '/' },
          { text: 'PROJECT-CONTEXT', link: '/00-meta/PROJECT-CONTEXT' },
          { text: 'platform-for-users', link: '/01-goal/platform-for-users' },
          { text: 'club-access', link: '/01-goal/club-access' },
          { text: 'karma-and-rating', link: '/01-goal/karma-and-rating' },
          { text: 'roles', link: '/01-goal/roles' },
          { text: 'platform-scenarios', link: '/01-goal/platform-scenarios' },
        ],
      },
      {
        text: '01 · Цель',
        collapsed: true,
        items: [
          { text: 'README', link: '/01-goal/README' },
          { text: 'content-brief', link: '/01-goal/content-brief' },
          { text: 'legal-documents', link: '/01-goal/legal-documents' },
          { text: 'Сценарии: frequent', link: '/01-goal/scenarios/frequent' },
          { text: 'Сценарии: occasional', link: '/01-goal/scenarios/occasional' },
          { text: 'Сценарии: rare', link: '/01-goal/scenarios/rare' },
        ],
      },
      {
        text: '03 · Архитектура',
        collapsed: true,
        items: [
          { text: 'README', link: '/03-architecture/README' },
          { text: 'Event catalog', link: '/03-architecture/event-catalog' },
          { text: 'Messaging (RabbitMQ)', link: '/03-architecture/messaging' },
          { text: 'ADR index', link: '/03-architecture/adr/README' },
          { text: 'ADR-011 Webhooks', link: '/03-architecture/adr/011-centralized-outbound-webhooks' },
        ],
      },
      {
        text: '04 · Деплой',
        collapsed: true,
        items: [
          { text: 'README', link: '/04-deployment/README' },
          { text: 'GitHub Actions', link: '/04-deployment/github-actions' },
          { text: 'local-dev', link: '/04-deployment/local-dev' },
        ],
      },
      {
        text: '05 · Микросервисы',
        collapsed: true,
        items: [
          { text: 'README', link: '/05-microservices/README' },
          { text: 'PLATFORM-REGISTRY', link: '/05-microservices/PLATFORM-REGISTRY' },
          { text: 'MICROSERVICE-SPEC', link: '/05-microservices/MICROSERVICE-SPEC' },
          { text: 'bff', link: '/05-microservices/bff/README' },
          { text: 'billing', link: '/05-microservices/billing/README' },
          { text: 'financial-policy', link: '/05-microservices/financial-policy/README' },
          { text: 'auction', link: '/05-microservices/auction/README' },
          { text: 'subscriptions', link: '/05-microservices/subscriptions/README' },
          { text: 'forum', link: '/05-microservices/forum/README' },
          { text: 'rating', link: '/05-microservices/rating/README' },
          { text: 'deal-feedback', link: '/05-microservices/deal_feedback/README' },
          { text: 'user-profile', link: '/05-microservices/user-profile/README' },
          { text: 'settings', link: '/05-microservices/settings/README' },
          { text: 'notifications', link: '/05-microservices/notifications/README' },
          { text: 'webhooks', link: '/05-microservices/webhooks/README' },
          { text: 'marketplace', link: '/05-microservices/marketplace/README' },
        ],
      },
      {
        text: '11 · UX/UI',
        collapsed: true,
        items: [
          { text: 'README', link: '/11-ux-ui/README' },
          { text: 'Information Architecture', link: '/11-ux-ui/information-architecture' },
          { text: 'Wireframes', link: '/11-ux-ui/wireframes/README' },
        ],
      },
      {
        text: '14 · Frontend',
        collapsed: true,
        items: [{ text: 'README', link: '/14-frontend/README' }],
      },
    ],
    search: {
      provider: 'local',
    },
  },
})
