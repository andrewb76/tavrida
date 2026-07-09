const POST_AUTH_REDIRECT_KEY = 'tavrida.auth.redirect';

export function setPostAuthRedirect(path: string): void {
  sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
}

export function consumePostAuthRedirect(): string | null {
  const path = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return path;
}
