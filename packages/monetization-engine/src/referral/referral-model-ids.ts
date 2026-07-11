export const REFERRAL_MODEL_IDS = [
  'revshare_single',
  'revshare_multi_decay',
  'cpa_first_charge',
  'bilateral_first_sub',
] as const;

export type ReferralModelId = (typeof REFERRAL_MODEL_IDS)[number];

export function isReferralModelId(value: string): value is ReferralModelId {
  return (REFERRAL_MODEL_IDS as readonly string[]).includes(value);
}
