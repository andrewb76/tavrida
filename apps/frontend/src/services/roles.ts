import { bffAuthHeaders, requireBearerToken } from './apiAuth';
import { useSessionStore } from '@/stores/session';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

type RolesResponse = { roles: PlatformRole[] };

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

function useMockApi(): boolean {
  return import.meta.env.VITE_USE_MOCK !== 'false';
}

let refreshPromise: Promise<PlatformRole[]> | null = null;

export async function fetchPlatformRoles(): Promise<PlatformRole[]> {
  const session = useSessionStore();

  // With real Logto, roles always come from BFF+Keto (not invite mock mode).
  if (!session.logtoEnabled && useMockApi()) {
    return ['member'];
  }

  await requireBearerToken();
  const res = await fetch(`${apiBase()}/me/roles`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });

  if (!res.ok) {
    throw new Error(`Failed to load roles (${res.status})`);
  }

  const body = (await res.json()) as RolesResponse;
  return body.roles?.length ? body.roles : ['member'];
}

/** Load roles into session store; dedupes concurrent calls. */
export async function refreshPlatformRoles(): Promise<PlatformRole[]> {
  const session = useSessionStore();

  if (!session.isMember) {
    session.setPlatformRoles([]);
    return [];
  }

  if (!refreshPromise) {
    session.setRolesLoading(true);
    refreshPromise = fetchPlatformRoles()
      .then((roles) => {
        session.setPlatformRoles(roles);
        return roles;
      })
      .catch(() => {
        session.setPlatformRoles(['member']);
        return ['member'] as PlatformRole[];
      })
      .finally(() => {
        session.setRolesLoading(false);
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
