import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

export type OracleDefaults = Record<string, unknown> & {
  version: string;
  currency: string;
};

const DEFAULT_RELATIVE = 'config/oracle.defaults.yaml';

export function resolveOracleDefaultsPath(): string {
  const fromEnv = process.env.ORACLE_DEFAULTS_PATH;
  if (fromEnv) return resolve(fromEnv);
  return resolve(__dirname, '../../../../../config/oracle.defaults.yaml');
}

export function loadOracleDefaults(path = resolveOracleDefaultsPath()): OracleDefaults {
  const raw = readFileSync(path, 'utf8');
  const parsed = parse(raw) as OracleDefaults;
  if (!parsed?.version || !parsed?.currency) {
    throw new Error(`Invalid oracle defaults at ${path}`);
  }
  return parsed;
}

export function buildOracleOverlay(defaults: OracleDefaults): Record<string, unknown> {
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
