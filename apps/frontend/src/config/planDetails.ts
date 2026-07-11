export type PlanFeature = {
  text: string;
  included: boolean;
};

export type PlanFeatureSection = {
  title: string;
  features: PlanFeature[];
};

export type PlanDetails = {
  tagline: string;
  badge?: string;
  highlights: string[];
  sections: PlanFeatureSection[];
};

export const PLAN_DETAILS: Record<string, PlanDetails> = {
  free: {
    tagline: 'Вход в клуб: аукционы, форум и инвайты с базовыми лимитами.',
    highlights: [
      'Доступ к аукционам и форуму',
      '1 инвайт-код в месяц',
      'Комментарии только к темам',
    ],
    sections: [
      {
        title: 'Аукционы',
        features: [
          { text: 'До 2 активных своих лотов', included: true },
          { text: 'До 3 новых лотов в сутки', included: true },
          { text: 'Участие в 5 торгах одновременно', included: true },
          { text: 'Продвижение и резервная цена', included: false },
        ],
      },
      {
        title: 'Форум',
        features: [
          { text: 'До 10 постов в сутки', included: true },
          { text: 'Поиск по заголовкам', included: true },
          { text: 'Вложенные ответы', included: false },
          { text: 'Push и email-дайджест', included: false },
        ],
      },
      {
        title: 'Клуб',
        features: [
          { text: '1 новый инвайт в месяц', included: true },
          { text: 'Реферальные выплаты', included: false },
          { text: 'Свои webhooks', included: false },
        ],
      },
    ],
  },
  basic: {
    tagline: 'Больше лимитов, вложенные обсуждения и реферальная программа.',
    badge: 'Популярный',
    highlights: [
      'Вложенные ответы в форуме',
      '3 инвайта в месяц',
      'Реферальные выплаты',
    ],
    sections: [
      {
        title: 'Аукционы',
        features: [
          { text: 'До 5 активных своих лотов', included: true },
          { text: 'До 10 новых лотов в сутки', included: true },
          { text: 'Участие в 20 торгах одновременно', included: true },
          { text: 'Английский и голландский аукцион', included: true },
          { text: 'Продвижение лотов (тариф Pro)', included: false },
        ],
      },
      {
        title: 'Форум',
        features: [
          { text: 'До 50 постов в сутки', included: true },
          { text: 'Вложенные ответы (до 5 уровней)', included: true },
          { text: 'Полнотекстовый поиск', included: true },
          { text: '1 прикреплённая тема', included: true },
          { text: 'Чат в теме и расширенный поиск', included: false },
        ],
      },
      {
        title: 'Клуб и интеграции',
        features: [
          { text: '3 инвайта в месяц', included: true },
          { text: 'Реферальная программа с выплатами', included: true },
          { text: 'До 2 webhook endpoint', included: true },
          { text: 'Подписки на категории и темы', included: true },
        ],
      },
    ],
  },
  pro: {
    tagline: 'Максимум лимитов, продвижение лотов и Pro-возможности форума.',
    highlights: [
      'Без лимитов на лоты и посты',
      'Продвижение лотов и аналитика',
      'Push, дайджест и чат в темах',
    ],
    sections: [
      {
        title: 'Аукционы',
        features: [
          { text: 'Без лимита активных лотов', included: true },
          { text: 'Без лимита новых лотов в сутки', included: true },
          { text: 'Все типы аукционов', included: true },
          { text: 'Продвижение лотов и резервная цена', included: true },
          { text: 'Дашборд статистики по лотам', included: true },
        ],
      },
      {
        title: 'Форум',
        features: [
          { text: 'Без лимита постов', included: true },
          { text: 'Вложенные ответы без ограничения глубины', included: true },
          { text: 'Push при ответах и email-дайджест', included: true },
          { text: 'Чат внутри темы', included: true },
          { text: 'Анонимные посты и теги с приоритетом', included: true },
          { text: 'Платные Pro-реакции', included: true },
        ],
      },
      {
        title: 'Клуб и интеграции',
        features: [
          { text: '10 инвайтов в месяц', included: true },
          { text: 'Повышенный лимит реферальных выплат', included: true },
          { text: 'До 10 webhook endpoint', included: true },
          { text: 'Маркетплейс: без лимита объявлений', included: true },
        ],
      },
    ],
  },
};

export function getPlanDetails(planId: string): PlanDetails | undefined {
  return PLAN_DETAILS[planId];
}
