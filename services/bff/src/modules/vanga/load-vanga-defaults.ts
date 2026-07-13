import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

export type VangaDefaults = Record<string, unknown> & {
  version: string;
  currency: string;
};

const DEFAULT_RELATIVE = 'config/vanga.defaults.yaml';

export function resolveVangaDefaultsPath(): string {
  const fromEnv = process.env.VANGA_DEFAULTS_PATH ?? process.env.ORACLE_DEFAULTS_PATH;
  if (fromEnv) return resolve(fromEnv);
  return resolve(__dirname, '../../../../../config/vanga.defaults.yaml');
}

export function loadVangaDefaults(path = resolveVangaDefaultsPath()): VangaDefaults {
  const raw = readFileSync(path, 'utf8');
  const parsed = parse(raw) as VangaDefaults;
  if (!parsed?.version || !parsed?.currency) {
    throw new Error(`Invalid vanga defaults at ${path}`);
  }
  return parsed;
}

export function buildVangaOverlay(defaults: VangaDefaults): Record<string, unknown> {
  const subscriptions = defaults.subscriptions as Record<string, Record<string, { default?: number }>> | undefined;
  const referral = defaults.referral as {
    programEnabled?: { default?: boolean };
    calculationModelId?: { default?: string };
  } | undefined;

  return {
    'subscriptions.basic.monthlyPrice': subscriptions?.basic?.monthlyPrice?.default ?? null,
    'subscriptions.basic.yearlyPrice': subscriptions?.basic?.yearlyPrice?.default ?? null,
    'subscriptions.pro.monthlyPrice': subscriptions?.pro?.monthlyPrice?.default ?? null,
    'subscriptions.pro.yearlyPrice': subscriptions?.pro?.yearlyPrice?.default ?? null,
    'referralRewards.globalEnabled': referral?.programEnabled?.default ?? false,
    'referralRewards.defaultModelId': referral?.calculationModelId?.default ?? 'revshare_single',
  };
}

export { DEFAULT_RELATIVE };
