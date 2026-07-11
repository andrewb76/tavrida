import { useSessionStore } from '@/stores/session';

/** Bearer token for BFF — fails fast with a user-facing message. */
export async function requireBearerToken(): Promise<string> {
  const session = useSessionStore();
  const token = await session.getAccessToken();

  if (token) return token;

  if (session.logtoEnabled) {
    throw new Error('Сессия истекла — войдите снова');
  }

  throw new Error('Войдите в аккаунт');
}
