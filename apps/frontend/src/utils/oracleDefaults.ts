import type { RangeSpec } from '@/services/oracle.types';

export function readRange(section: unknown, key: string, fallback = 0): number {
  if (!section || typeof section !== 'object') return fallback;
  const row = (section as Record<string, RangeSpec>)[key];
  const value = row?.default;
  return typeof value === 'number' ? value : fallback;
}

export function readRangeSpec(section: unknown, key: string): RangeSpec {
  if (!section || typeof section !== 'object') return { default: 0, min: 0, max: 100, step: 1 };
  const row = (section as Record<string, RangeSpec>)[key];
  return row ?? { default: 0, min: 0, max: 100, step: 1 };
}

export function readBoolDefault(section: unknown, key: string, fallback = false): boolean {
  if (!section || typeof section !== 'object') return fallback;
  const row = (section as Record<string, RangeSpec>)[key];
  return typeof row?.default === 'boolean' ? row.default : fallback;
}

export function formatRub(value: number, currency = 'RUB'): string {
  if (currency === 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return String(Math.round(value));
}

export function sumCostItems(items: Record<string, number>): number {
  return Object.values(items).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}
