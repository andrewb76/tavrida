export type AuthMode = 'jwks' | 'dev-token';

type AuthEnvironment = {
  NODE_ENV?: string;
  BFF_ALLOW_DEV_TOKENS?: string;
  LOGTO_ENDPOINT?: string;
  LOGTO_JWKS_URL?: string;
  LOGTO_AUDIENCE?: string;
};

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function isPlaceholder(value: string | undefined): boolean {
  return !value?.trim() || value.includes('example.com');
}

/**
 * Resolve authentication mode once at startup.
 * Dev tokens require an explicit opt-in and can never be enabled in production.
 */
export function resolveAuthMode(env: AuthEnvironment): AuthMode {
  const production = env.NODE_ENV === 'production';
  const allowDevTokens = isTrue(env.BFF_ALLOW_DEV_TOKENS);
  const hasJwksConfig =
    !isPlaceholder(env.LOGTO_ENDPOINT) &&
    !isPlaceholder(env.LOGTO_JWKS_URL) &&
    Boolean(env.LOGTO_AUDIENCE?.trim());

  if (hasJwksConfig) return 'jwks';
  if (!production && allowDevTokens) return 'dev-token';

  throw new Error(
    'BFF auth is not configured: set LOGTO_ENDPOINT, LOGTO_JWKS_URL and LOGTO_AUDIENCE, ' +
      'or explicitly set BFF_ALLOW_DEV_TOKENS=true outside production',
  );
}

