export function formatMoney(amount: number, currency = 'RUB'): string {
  const formatted = new Intl.NumberFormat('ru-RU').format(amount);
  return currency === 'RUB' ? `${formatted} ₽` : `${formatted} ${currency}`;
}

export function auctionTypeLabel(type: string): string {
  if (type === 'DUTCH') return 'Голландский аукцион';
  return 'Английский аукцион';
}

export function auctionStatusLabel(input: {
  status: string;
  isLive: boolean;
  startsAt: string | null;
}): string {
  if (input.status === 'ENDED') return 'Завершён';
  if (input.status === 'CANCELLED') return 'Отменён';
  if (input.isLive) return 'Идут торги';
  if (input.status === 'SCHEDULED') return 'Запланирован';
  if (input.startsAt && new Date(input.startsAt) > new Date()) return 'Скоро начнётся';
  return input.status;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Elapsed auction time as 0–100, based on startsAt/endsAt and remaining countdown. */
export function auctionTimeProgressPercent(input: {
  startsAt: string;
  endsAt: string;
  remainingMs: number;
}): number | null {
  const start = new Date(input.startsAt).getTime();
  const end = new Date(input.endsAt).getTime();
  const total = end - start;
  if (total <= 0) return null;

  const elapsed = total - Math.max(0, input.remainingMs);
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function sellerDisplayName(sellerId: string): string {
  const map: Record<string, string> = {
    'seed-seller-1': 'Андрей К.',
    'seed-seller-2': 'Мария П.',
    'seed-seller-3': 'Игорь В.',
  };
  return map[sellerId] ?? sellerId;
}
