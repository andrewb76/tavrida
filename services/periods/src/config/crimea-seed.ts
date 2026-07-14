/**
 * Demo seed: Crimea / Northern Black Sea historical periods.
 * Dates use CE ISO (YYYY-MM-DD); BCE context is described in titles/summaries
 * (partition date compare is lexicographic and unreliable for negative years).
 */

export type SeedPeriodNode = {
  title: string;
  summary: string;
  body?: string;
  startsOn: string;
  endsOn: string;
  metadata?: Record<string, unknown>;
  children?: SeedPeriodNode[];
};

export type SeedCategoryTree = {
  categorySlug: string;
  roots: SeedPeriodNode[];
};

export const CRIMEA_PERIOD_TREES: SeedCategoryTree[] = [
  {
    categorySlug: 'epochs',
    roots: [
      {
        title: 'Античность Причерноморья',
        summary: 'Греческая колонизация, Боспор, Херсонес; условно I–V вв. н.э. (с отсылкой к более ранним горизонтам).',
        startsOn: '0001-01-01',
        endsOn: '0476-01-01',
        metadata: { convention: 'CE approx; BCE horizons in cultures layer' },
      },
      {
        title: 'Раннее средневековье',
        summary: 'Гунны, тюрки, хазары, византийский Херсон.',
        startsOn: '0476-01-01',
        endsOn: '1000-01-01',
        metadata: { convention: 'CE' },
      },
      {
        title: 'Высокое и позднее средневековье',
        summary: 'Кыпчаки, Золотая Орда, Генуя в Кафе, княжество Феодоро.',
        startsOn: '1000-01-01',
        endsOn: '1475-01-01',
        metadata: { convention: 'CE' },
      },
      {
        title: 'Крымское ханство и османский Крым',
        summary: 'Эпоха Гиреев и османского протектората до присоединения к России.',
        startsOn: '1441-01-01',
        endsOn: '1783-01-01',
        metadata: { convention: 'CE' },
      },
      {
        title: 'Российский / советский / современный Крым',
        summary: 'С 1783 г. до наших дней.',
        startsOn: '1783-01-01',
        endsOn: '2026-12-31',
        metadata: { convention: 'CE' },
      },
    ],
  },
  {
    categorySlug: 'cultures',
    roots: [
      {
        title: 'Киммерийцы',
        summary: 'Ранний железный век Северного Причерноморья (условно IX–VII вв. до н.э.).',
        startsOn: '0001-01-01',
        endsOn: '0100-01-01',
        metadata: {
          region: 'Северное Причерноморье / Крым',
          materialCulture: 'бронза / раннее железо',
          burialRite: 'kurgan',
        },
      },
      {
        title: 'Скифы',
        summary: 'Степная культура VII–III вв. до н.э.; курганы, звериный стиль.',
        startsOn: '0001-01-01',
        endsOn: '0200-01-01',
        metadata: {
          region: 'Степь + Крым',
          materialCulture: 'золото / железо, звериный стиль',
          burialRite: 'kurgan',
        },
      },
      {
        title: 'Тавры',
        summary: 'Горный / южный Крым; контакты с греческими колониями.',
        startsOn: '0001-01-01',
        endsOn: '0200-01-01',
        metadata: {
          region: 'Южный берег / горы Крыма',
          materialCulture: 'керамика, оружие',
          burialRite: 'other',
        },
      },
      {
        title: 'Сарматы',
        summary: 'Иранские кочевники степи; влияние на поздний Боспор.',
        startsOn: '0050-01-01',
        endsOn: '0400-01-01',
        metadata: {
          region: 'Северное Причерноморье',
          burialRite: 'catacomb',
        },
      },
      {
        title: 'Готы (Крым)',
        summary: 'Готские общины и «готский» горизонт поздней античности — раннего средневековья.',
        startsOn: '0250-01-01',
        endsOn: '0800-01-01',
        metadata: {
          region: 'Юго-Западный Крым',
          burialRite: 'inhumation',
        },
      },
    ],
  },
  {
    categorySlug: 'polities',
    roots: [
      {
        title: 'Боспорское царство',
        summary: 'Эллинистическое / римское царство вокруг Керченского пролива.',
        startsOn: '0001-01-01',
        endsOn: '0370-01-01',
        metadata: { capital: 'Пантикапей', polityType: 'kingdom' },
      },
      {
        title: 'Херсонес Таврический',
        summary: 'Дорийская колония и византийский Херсон.',
        startsOn: '0001-01-01',
        endsOn: '1396-01-01',
        metadata: { capital: 'Херсонес', polityType: 'colony' },
      },
      {
        title: 'Генуэзская Газария (Кафа)',
        summary: 'Генуэзские фактории на южном берегу; Кафа — ключевой порт.',
        startsOn: '1266-01-01',
        endsOn: '1475-01-01',
        metadata: { capital: 'Кафа', polityType: 'republic' },
        children: [
          {
            title: 'Становление факторий',
            summary: 'Закрепление генуэзцев после договоров с Ордой.',
            startsOn: '1266-01-01',
            endsOn: '1380-01-01',
            metadata: { capital: 'Кафа', polityType: 'republic' },
          },
          {
            title: 'Расцвет и османская угроза',
            summary: 'До взятия Кафы османами в 1475 г.',
            startsOn: '1380-01-01',
            endsOn: '1475-01-01',
            metadata: { capital: 'Кафа', polityType: 'republic' },
          },
        ],
      },
      {
        title: 'Крымское ханство',
        summary: 'Государство Гиреев под османским протекторатом.',
        startsOn: '1441-01-01',
        endsOn: '1783-01-01',
        metadata: { capital: 'Бахчисарай', polityType: 'khanate' },
        children: [
          {
            title: 'Раннее ханство',
            summary: 'От Хаджи Герая до закрепления османского протектората.',
            startsOn: '1441-01-01',
            endsOn: '1532-01-01',
            metadata: { capital: 'Кырк-Ер / Бахчисарай', polityType: 'khanate' },
          },
          {
            title: 'Классическое ханство',
            summary: 'Эпоха походов и устойчивой системы беев.',
            startsOn: '1532-01-01',
            endsOn: '1700-01-01',
            metadata: { capital: 'Бахчисарай', polityType: 'khanate' },
          },
          {
            title: 'Позднее ханство',
            summary: 'Дестабилизация, Кючук-Кайнарджийский мир и ликвидация в 1783 г.',
            startsOn: '1700-01-01',
            endsOn: '1783-01-01',
            metadata: { capital: 'Бахчисарай', polityType: 'khanate' },
          },
        ],
      },
    ],
  },
  {
    categorySlug: 'dynasties',
    roots: [
      {
        title: 'Дом Гиреев',
        summary: 'Правящий дом Крымского ханства.',
        startsOn: '1441-01-01',
        endsOn: '1783-01-01',
        metadata: { origin: 'Чингизиды', seat: 'Бахчисарай' },
        children: [
          {
            title: 'Хаджи Герай и ранняя династия',
            summary: 'Основание ханства.',
            startsOn: '1441-01-01',
            endsOn: '1466-01-01',
            metadata: { origin: 'Чингизиды', seat: 'Кырк-Ер' },
          },
          {
            title: 'Менгли Герай и османский протекторат',
            summary: 'Закрепление связи с Портой.',
            startsOn: '1466-01-01',
            endsOn: '1515-01-01',
            metadata: { origin: 'Чингизиды', seat: 'Бахчисарай' },
          },
          {
            title: 'Средние Гиреи',
            summary: 'XVI–XVII вв.: военные походы и стабилизация двора.',
            startsOn: '1515-01-01',
            endsOn: '1700-01-01',
            metadata: { origin: 'Чингизиды', seat: 'Бахчисарай' },
          },
          {
            title: 'Поздние Гиреи',
            summary: 'XVIII в. до ликвидации ханства.',
            startsOn: '1700-01-01',
            endsOn: '1783-01-01',
            metadata: { origin: 'Чингизиды', seat: 'Бахчисарай' },
          },
        ],
      },
      {
        title: 'Спартокиды (Боспор)',
        summary: 'Династия Боспорского царства (эллинистический и римский периоды).',
        startsOn: '0001-01-01',
        endsOn: '0341-01-01',
        metadata: { origin: 'фрако-греческое', seat: 'Пантикапей' },
      },
    ],
  },
  {
    categorySlug: 'religions',
    roots: [
      {
        title: 'Античные культуры и язычество',
        summary: 'Греческие, скифские и местные культы.',
        startsOn: '0001-01-01',
        endsOn: '0400-01-01',
        metadata: { tradition: 'pagan' },
      },
      {
        title: 'Христианство (православная традиция)',
        summary: 'От поздней античности / Византии до Нового времени.',
        startsOn: '0300-01-01',
        endsOn: '2026-12-31',
        metadata: { tradition: 'orthodox' },
      },
      {
        title: 'Ислам (суннитская традиция)',
        summary: 'С эпохи Золотой Орды и Крымского ханства.',
        startsOn: '1250-01-01',
        endsOn: '2026-12-31',
        metadata: { tradition: 'sunni' },
      },
      {
        title: 'Иудаизм (караимы / крымчаки)',
        summary: 'Общины Крыма, связанные с Чуфут-Кале и торговыми городами.',
        startsOn: '1200-01-01',
        endsOn: '2026-12-31',
        metadata: { tradition: 'judaism' },
      },
    ],
  },
  {
    categorySlug: 'craft_traditions',
    roots: [
      {
        title: 'Скифский звериный стиль',
        summary: 'Золото, бронза, кость — образы хищников и копытных.',
        startsOn: '0001-01-01',
        endsOn: '0200-01-01',
        metadata: {
          medium: 'золото / бронза',
          diagnosticTraits: 'стилизованные животные, аппликации на оружии и уборе',
        },
      },
      {
        title: 'Греческая чернолаковая и столовая керамика',
        summary: 'Импорт и местные подражания в колониях.',
        startsOn: '0001-01-01',
        endsOn: '0300-01-01',
        metadata: {
          medium: 'керамика',
          diagnosticTraits: 'черный лак, формы кратеров / киликов',
        },
      },
      {
        title: 'Генуэзская / итальянская нумизматика Причерноморья',
        summary: 'Монетное дело факторий (аспры и др.).',
        startsOn: '1266-01-01',
        endsOn: '1475-01-01',
        metadata: {
          medium: 'чеканка',
          diagnosticTraits: 'латинские легенды, гербы Генуи',
        },
      },
      {
        title: 'Крымскотатарская ювелирка и оружие',
        summary: 'Серебро, чернь, булат — эпоха ханства.',
        startsOn: '1441-01-01',
        endsOn: '1783-01-01',
        metadata: {
          medium: 'серебро / сталь',
          diagnosticTraits: 'растительный орнамент, ножны, пояса',
        },
      },
    ],
  },
  {
    categorySlug: 'trade_networks',
    roots: [
      {
        title: 'Греческая колонизационная сеть',
        summary: 'Связи метрополий с Понтом и Боспором.',
        startsOn: '0001-01-01',
        endsOn: '0300-01-01',
        metadata: {
          hubs: ['Пантикапей', 'Херсонес', 'Ольвия'],
          goods: ['зерно', 'рыба', 'вино', 'керамика'],
        },
      },
      {
        title: 'Генуэзский черноморский контур',
        summary: 'Кафа — Солдайя — Чембало и связь с Средиземноморьем.',
        startsOn: '1266-01-01',
        endsOn: '1475-01-01',
        metadata: {
          hubs: ['Кафа', 'Солдайя', 'Чембало'],
          goods: ['рабы', 'соль', 'рыба', 'ткани'],
        },
      },
      {
        title: 'Ханский степной обмен',
        summary: 'Связи Крыма с Ордой, Кавказом и османским рынком.',
        startsOn: '1441-01-01',
        endsOn: '1783-01-01',
        metadata: {
          hubs: ['Бахчисарай', 'Гёзлёв', 'Кафа'],
          goods: ['лошади', 'скот', 'соль', 'пленники'],
        },
      },
    ],
  },
];
