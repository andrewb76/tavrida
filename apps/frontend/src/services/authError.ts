/** Human-readable Logto / OIDC error from callback or SDK. */
export function formatAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Ошибка входа';

  const record = error as {
    message?: string;
    data?: { error?: string; errorDescription?: string };
  };

  const oidc = record.data;
  if (oidc?.error) {
    const detail = oidc.errorDescription ? ` — ${oidc.errorDescription}` : '';
    return `Logto: ${oidc.error}${detail}`;
  }

  return record.message ?? 'Ошибка входа';
}
