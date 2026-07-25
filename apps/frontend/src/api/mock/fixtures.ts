/** Mock auction listings for dev scaffold (W02). */
export type MockAuction = {
  id: string;
  title: string;
  currentPrice: number;
  status: 'ACTIVE' | 'ENDED';
  live: boolean;
};

export const mockAuctions: MockAuction[] = [
  { id: '1', title: 'Монета 1787', currentPrice: 1500, status: 'ACTIVE', live: true },
  { id: '2', title: 'Кольцо византийское', currentPrice: 8200, status: 'ACTIVE', live: true },
  { id: '3', title: 'Фрагмент амфоры', currentPrice: 450, status: 'ACTIVE', live: false },
  { id: '4', title: 'Серебряный крест', currentPrice: 3100, status: 'ENDED', live: false },
];

export const mockBalance = 1250;

export const mockForumTopics = [
  { id: 't1', title: 'Чёрный слой на монете — чистить?', comments: 12 },
  { id: 't2', title: 'Как хранить вещи у моря', comments: 5 },
];
