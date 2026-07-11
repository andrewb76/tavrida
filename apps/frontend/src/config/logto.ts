import type { LogtoConfig } from '@logto/vue';

/** Logto Cloud (SaaS) now; self-host later — same env shape, different endpoint URL. */
export function isLogtoConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_LOGTO_ENDPOINT?.trim() &&
      import.meta.env.VITE_LOGTO_APP_ID?.trim(),
  );
}

export function createLogtoConfig(): LogtoConfig | null {
  if (!isLogtoConfigured()) return null;

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

  // Do NOT add `resources` here until API Resource exists in Logto Console.
  // VITE_LOGTO_API_RESOURCE is used only for optional getAccessToken() — ID token fallback covers BFF in dev.

  return config;
}

export function signInRedirectUri(): string {
  return `${window.location.origin}/callback`;
}

export function signOutRedirectUri(): string {
  return `${window.location.origin}/`;
}

export function logtoApiResource(): string | undefined {
  return import.meta.env.VITE_LOGTO_API_RESOURCE?.trim() || undefined;
}
