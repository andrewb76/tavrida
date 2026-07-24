import type { LogtoConfig } from '@logto/vue';

/** Logto Cloud (SaaS) now; self-host later — same env shape, different endpoint URL. */
export function isLogtoConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_LOGTO_ENDPOINT?.trim() &&
      import.meta.env.VITE_LOGTO_APP_ID?.trim(),
  );
}

export function logtoApiResource(): string | undefined {
  return import.meta.env.VITE_LOGTO_API_RESOURCE?.trim() || undefined;
}

export function createLogtoConfig(): LogtoConfig | null {
  if (!isLogtoConfigured()) return null;

  const apiResource = logtoApiResource();

  const config: LogtoConfig = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT!,
    appId: import.meta.env.VITE_LOGTO_APP_ID!,
    /**
     * `profile` — name + picture for profile UI (first-party SPA).
     * Add `email` here if the app requests email in Console → Permissions.
     */
    scopes: ['openid', 'offline_access', 'profile'],
    includeReservedScopes: false,
  };

  // Required for access tokens whose `aud` matches BFF `LOGTO_AUDIENCE`.
  // Only set when the API Resource already exists in Logto Console and is
  // assigned to this SPA — otherwise callback fails with resource error.
  if (apiResource) {
    config.resources = [apiResource];
  }

  return config;
}

export function signInRedirectUri(): string {
  return `${window.location.origin}/callback`;
}

export function signOutRedirectUri(): string {
  return `${window.location.origin}/`;
}

/**
 * Logto prebuilt Account Center — profile (name, avatar).
 * @see https://docs.logto.io/end-user-flows/account-settings/by-account-center-ui
 */
export function logtoAccountProfileUrl(redirectUrl?: string): string | null {
  return logtoAccountCenterUrl('/account/profile', redirectUrl ?? `${window.location.origin}/profile/me`);
}

/**
 * Logto Account Center — edit username (club @handle; SoT = Logto).
 * @see docs/05-microservices/user-profile/requirements/username.md
 */
export function logtoAccountUsernameUrl(redirectUrl?: string): string | null {
  return logtoAccountCenterUrl('/account/username', redirectUrl ?? `${window.location.origin}/profile/me`);
}

function logtoAccountCenterUrl(path: string, redirect: string): string | null {
  const endpoint = import.meta.env.VITE_LOGTO_ENDPOINT?.trim().replace(/\/$/, '');
  if (!endpoint) return null;

  const url = new URL(`${endpoint}${path}`);
  url.searchParams.set('redirect', redirect);
  url.searchParams.set('show_success', 'true');
  url.searchParams.set('ui_locales', 'ru');
  return url.toString();
}
