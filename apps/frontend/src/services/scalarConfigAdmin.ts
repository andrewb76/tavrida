import { requireBearerToken } from './apiAuth';

export type ClubSettings = {
  'registration.inviteOnly'?: boolean;
  'invite.validityDays'?: number;
  'invite.codeType'?: 'SINGLE_USE' | 'MULTI_USE';
  'landing.publicSections'?: string[];
};

export type ScalarRegistryEntry = {
  key: string;
  service: string;
  type: string;
  description: string | null;
  syncStatus: 'active' | 'stale';
  defaultValue: unknown;
  value: unknown;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

export async function fetchClubSettings(): Promise<ClubSettings> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/scalar-config/club`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load club settings (${res.status})`);
  }
  return (await res.json()) as ClubSettings;
}

export async function saveClubSettings(patch: ClubSettings): Promise<ClubSettings> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/scalar-config/club`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let detail = `Failed to save club settings (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ClubSettings;
}

export async function fetchScalarRegistry(): Promise<ScalarRegistryEntry[]> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/scalar-config/registry`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load scalar registry (${res.status})`);
  }
  const json = (await res.json()) as { data: ScalarRegistryEntry[] };
  return json.data;
}

export async function deleteScalarKey(key: string): Promise<void> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}/admin/scalar-config/keys/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to delete scalar key (${res.status})`);
  }
}
