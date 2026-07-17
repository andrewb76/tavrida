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

const refreshPromises = new Map<string, Promise<PlatformRole[]>>();

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

  const identity = session.actAsUserId ?? session.userId;
  if (!identity) return [];
  const existing = refreshPromises.get(identity);
  if (existing) return existing;

  session.setPlatformRoles([]);
  session.setRolesLoading(true);
  const request = fetchPlatformRoles()
      .then((roles) => {
        const current = useSessionStore();
        if ((current.actAsUserId ?? current.userId) === identity) {
          current.setPlatformRoles(roles);
        }
        return roles;
      })
      .catch(() => {
        const current = useSessionStore();
        if ((current.actAsUserId ?? current.userId) === identity) {
          current.setPlatformRoles(['member']);
        }
        return ['member'] as PlatformRole[];
      })
      .finally(() => {
        const current = useSessionStore();
        if ((current.actAsUserId ?? current.userId) === identity) {
          current.setRolesLoading(false);
        }
        if (refreshPromises.get(identity) === request) refreshPromises.delete(identity);
      });
  refreshPromises.set(identity, request);
  return request;
}
