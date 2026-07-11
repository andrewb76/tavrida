import type { RangeSpec } from '@/services/oracle.types';

export type ReferralModelId =
  | 'revshare_single'
  | 'revshare_multi_decay'
  | 'cpa_first_charge'
  | 'bilateral_first_sub';

export type ReferralModelOption = { id: ReferralModelId; label: string };

export type ReferralModelField = {
  key: string;
  label: string;
};

export const REFERRAL_MODEL_FIELDS: Record<ReferralModelId, ReferralModelField[]> = {
  revshare_single: [{ key: 'percentOfCharge', label: 'Доля от платежа, %' }],
  revshare_multi_decay: [
    { key: 'percentOfCharge', label: 'Доля от платежа, %' },
    { key: 'maxDepth', label: 'Макс. глубина дерева' },
  ],
  cpa_first_charge: [{ key: 'fixedAmountRub', label: 'Фикс за первую оплату, ₽' }],
  bilateral_first_sub: [
    { key: 'inviterBonusRub', label: 'Бонус пригласившему, ₽' },
    { key: 'inviteeBonusRub', label: 'Бонус приглашённому, ₽' },
  ],
};

export const REFERRAL_MODEL_LABELS: Record<ReferralModelId, string> = {
  revshare_single: 'Доля от платежа (1 уровень)',
  revshare_multi_decay: 'Многоуровневая с затуханием',
  cpa_first_charge: 'Фикс за первую оплату',
  bilateral_first_sub: 'Двусторонний бонус',
};

export function parseReferralModelOptions(config: Record<string, unknown>): ReferralModelOption[] {
  const block = config.referral as
    | { calculationModelId?: { options?: { id: string; label: string }[] } }
    | undefined;
  const options = block?.calculationModelId?.options ?? [];
  return options.map((row) => ({
    id: row.id as ReferralModelId,
    label: row.label,
  }));
}

export function readReferralModelSpec(
  config: Record<string, unknown>,
  modelId: ReferralModelId,
  fieldKey: string,
): RangeSpec {
  const models = (config.referral as { models?: Record<string, Record<string, RangeSpec>> })?.models;
  return models?.[modelId]?.[fieldKey] ?? { min: 0, max: 100, default: 0, step: 1 };
}

export function initReferralModelsFromConfig(
  config: Record<string, unknown>,
): Record<ReferralModelId, { enabled: boolean; params: Record<string, number> }> {
  const options = parseReferralModelOptions(config);
  const modelsYaml = (config.referral as { models?: Record<string, Record<string, RangeSpec>> })
    ?.models;
  const result = {} as Record<ReferralModelId, { enabled: boolean; params: Record<string, number> }>;

  for (const opt of options) {
    const section = modelsYaml?.[opt.id] ?? {};
    const params: Record<string, number> = {};
    for (const field of REFERRAL_MODEL_FIELDS[opt.id] ?? []) {
      const spec = section[field.key];
      params[field.key] = typeof spec?.default === 'number' ? spec.default : 0;
    }
    result[opt.id] = { enabled: false, params };
  }

  return result;
}

export function referralModelLabel(modelId: string): string {
  return REFERRAL_MODEL_LABELS[modelId as ReferralModelId] ?? modelId;
}
