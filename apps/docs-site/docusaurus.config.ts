import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Аукционная Платформа',
  tagline: 'Техническая документация экосистемы антиквариата и монет',
  favicon: 'img/favicon.ico',

  // Укажите здесь URL вашего будущего продакшн-сайта документации
  url: 'https://your-platform.com',
  baseUrl: '/',

  // Настройки для предотвращения падения сборки при битых ссылках
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'ru',
    locales: ['ru'],
  },

  // АКТИВАЦИЯ MERMAID ДЛЯ СХЕМ STATE MACHINE И ОЧЕРЕДЕЙ
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Документация будет открываться на главной странице порта 3001
        },
        blog: false, // Отключаем блог, так как нам нужна только техническая база знаний
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'База Знаний Платформы',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Архитектура и ТЗ',
        },
        {
          href: 'http://localhost:3000/api/docs',
          label: 'Swagger API (Порт 3000)',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `© ${new Date().getFullYear()} Auction Platform Ecosystem. Построено на Docusaurus, Turborepo и NestJS.`,
    },
    // Настройка подсветки синтаксиса для наших бэкенд-файлов
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'json', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
