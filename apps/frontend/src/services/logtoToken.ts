import type { useLogto } from '@logto/vue';

type LogtoClient = ReturnType<typeof useLogto>;

/**
 * Bearer for BFF.
 *
 * When `VITE_LOGTO_API_RESOURCE` is set, only an API-resource access token is
 * acceptable — its `aud` must match BFF `LOGTO_AUDIENCE`. Falling back to the
 * ID token would always 401 (ID token `aud` is the SPA client id).
 *
 * Without an API resource (early local bootstrap), ID token is used and BFF
 * must either accept it or run with `BFF_ALLOW_DEV_TOKENS`.
 */
export async function resolveBearerToken(
  logto: LogtoClient,
  resource?: string,
): Promise<string | undefined> {
  // Do not gate on isLoading — Logto runs afterSignIn while loading is still true.
  if (!logto.isAuthenticated.value) return undefined;

  if (resource) {
    try {
      const apiToken = await logto.getAccessToken(resource);
      if (apiToken) return apiToken;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Не удалось получить API-токен Logto для ${resource}. ` +
          `Проверьте API Resource в Console и что SPA имеет к нему доступ. (${detail})`,
      );
    }
    throw new Error(
      `Нет access token для ${resource}. Выйдите и войдите снова после настройки API Resource.`,
    );
  }

  return (await logto.getIdToken()) ?? (await logto.getAccessToken()) ?? undefined;
}
