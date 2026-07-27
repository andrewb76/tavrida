/**
 * API seed helpers for E2E setup/cleanup.
 * Prefer BFF HTTP over UI admin clicks.
 *
 * Env: `E2E_API_BASE_URL` (default http://127.0.0.1:3000/api/v1).
 * When BFF is down, callers should skip or use mock-only scenarios.
 */
export function apiBaseUrl(): string {
  return (
    process.env.E2E_API_BASE_URL?.trim() || 'http://127.0.0.1:3000/api/v1'
  );
}

export type SeedInviteResult = {
  code: string;
  token?: string;
};

/**
 * Placeholder: create invite via BFF when INTERNAL_SERVICE_TOKEN / admin JWT available.
 * W1 S-010 will wire the real call; until then throws to avoid silent false greens.
 */
export async function seedInvite(_opts?: {
  email?: string;
}): Promise<SeedInviteResult> {
  throw new Error(
    'seedInvite: not wired yet — set E2E_API_BASE_URL + auth and implement BFF create invite',
  );
}

export async function apiHealth(): Promise<boolean> {
  try {
    const base = apiBaseUrl().replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${base}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
