import type { useLogto } from '@logto/vue';

type LogtoClient = ReturnType<typeof useLogto>;

/**
 * Bearer for BFF: API resource token when configured, else ID token (local dev
 * before API resource exists in Logto Console).
 */
export async function resolveBearerToken(
  logto: LogtoClient,
  resource?: string,
): Promise<string | undefined> {
  // Do not gate on isLoading — Logto runs afterSignIn while loading is still true.
  if (!logto.isAuthenticated.value) return undefined;

  if (resource) {
    const apiToken = await logto.getAccessToken(resource);
    if (apiToken) return apiToken;
  }

  return (await logto.getIdToken()) ?? (await logto.getAccessToken()) ?? undefined;
}
