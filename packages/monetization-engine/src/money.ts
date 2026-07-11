/** Round to kopecks (2 decimal places) — billing uses decimal(12,2). */
export function roundRub(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizePlanMix(mix: { free: number; basic: number; pro: number }): {
  free: number;
  basic: number;
  pro: number;
} {
  const sum = mix.free + mix.basic + mix.pro;
  if (sum <= 0) return { free: 1, basic: 0, pro: 0 };
  return {
    free: mix.free / sum,
    basic: mix.basic / sum,
    pro: mix.pro / sum,
  };
}
