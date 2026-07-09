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

  const resource = import.meta.env.VITE_LOGTO_API_RESOURCE?.trim();
  const config: LogtoConfig = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT!,
    appId: import.meta.env.VITE_LOGTO_APP_ID!,
    /**
     * SDK default (includeReservedScopes=true) always adds `profile`.
     * Third-party apps must whitelist profile in Console → Permissions;
     * until then request only core OIDC scopes.
     */
    scopes: ['openid', 'offline_access'],
    includeReservedScopes: false,
  };

  if (resource) {
    config.resources = [resource];
  }

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
