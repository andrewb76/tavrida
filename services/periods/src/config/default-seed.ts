import type { MetadataSchema } from '../common/metadata-schema';

export type SeedCategory = {
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  metadataSchema: MetadataSchema;
};

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: 'cultures',
    title: 'Археологические культуры',
    description: 'Киммерийцы, скифы, тавры, сарматы, готы и др. культурные горизонты.',
    sortOrder: 10,
    metadataSchema: {
      fields: [
        { key: 'region', type: 'string', label: 'Ареал', required: false },
        { key: 'materialCulture', type: 'string', label: 'Материальная культура', required: false },
        {
          key: 'burialRite',
          type: 'enum',
          label: 'Погребальный обряд',
          options: ['kurgan', 'catacomb', 'cremation', 'inhumation', 'other', 'unknown'],
          required: false,
        },
      ],
    },
  },
  {
    slug: 'epochs',
    title: 'Эпохи / хронослои',
    description: 'Крупные хронологические рамки (античность, средневековье…).',
    sortOrder: 20,
    metadataSchema: {
      fields: [
        { key: 'convention', type: 'string', label: 'Шкала / конвенция датировки', required: false },
      ],
    },
  },
  {
    slug: 'polities',
    title: 'Государства и колонии',
    description: 'Боспор, Херсонес, генуэзские фактории, Крымское ханство и др.',
    sortOrder: 30,
    metadataSchema: {
      fields: [
        { key: 'capital', type: 'string', label: 'Столица / центр', required: false },
        {
          key: 'polityType',
          type: 'enum',
          label: 'Тип',
          options: ['kingdom', 'colony', 'khanate', 'republic', 'empire', 'other'],
          required: false,
        },
      ],
    },
  },
  {
    slug: 'dynasties',
    title: 'Царственные / правящие дома',
    description: 'Династии и дома; внутри — фамилии и правители.',
    sortOrder: 40,
    metadataSchema: {
      fields: [
        { key: 'origin', type: 'string', label: 'Происхождение', required: false },
        { key: 'seat', type: 'string', label: 'Резиденция', required: false },
      ],
    },
  },
  {
    slug: 'houses',
    title: 'Фамилии / роды',
    description: 'Родовые линии внутри правящего дома или знати.',
    sortOrder: 50,
    metadataSchema: {
      fields: [
        { key: 'patronym', type: 'string', label: 'Родовое имя', required: false },
        { key: 'armsBlazon', type: 'text', label: 'Герб / эмблема (описательно)', required: false },
      ],
    },
  },
  {
    slug: 'rulers',
    title: 'Правители',
    description: 'Персоны на престоле / у власти внутри фамилии.',
    sortOrder: 60,
    metadataSchema: {
      fields: [
        { key: 'regnalName', type: 'string', label: 'Тронное имя', required: false },
        { key: 'epithet', type: 'string', label: 'Прозвище', required: false },
        {
          key: 'succession',
          type: 'enum',
          label: 'Тип наследования',
          options: ['primogeniture', 'election', 'usurpation', 'appointment', 'other', 'unknown'],
          required: false,
        },
      ],
    },
  },
  {
    slug: 'religions',
    title: 'Конфессии и культы',
    description: 'Для атрибуции символики, обрядов, надписей.',
    sortOrder: 70,
    metadataSchema: {
      fields: [
        {
          key: 'tradition',
          type: 'enum',
          label: 'Традиция',
          options: ['orthodox', 'sunni', 'judaism', 'catholic', 'pagan', 'other'],
          required: false,
        },
      ],
    },
  },
  {
    slug: 'craft_traditions',
    title: 'Ремесленные традиции',
    description: 'Керамика, чеканка, ювелирка — стили производства находок.',
    sortOrder: 80,
    metadataSchema: {
      fields: [
        { key: 'medium', type: 'string', label: 'Материал / техника', required: false },
        { key: 'diagnosticTraits', type: 'text', label: 'Диагностические признаки', required: false },
      ],
    },
  },
  {
    slug: 'trade_networks',
    title: 'Торговые сети / пути',
    description: 'Маршруты и сети обмена, связанные с Крымом и Причерноморьем.',
    sortOrder: 90,
    metadataSchema: {
      fields: [
        { key: 'hubs', type: 'string[]', label: 'Хабы', required: false },
        { key: 'goods', type: 'string[]', label: 'Типичные товары', required: false },
      ],
    },
  },
];
