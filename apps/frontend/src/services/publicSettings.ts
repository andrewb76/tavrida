import type { PublicClubSettings } from './publicSettings.types';

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

export async function fetchPublicClubSettings(): Promise<PublicClubSettings> {
  const res = await fetch(`${apiBase()}/settings/public`);
  if (!res.ok) {
    throw new Error(`Failed to load public settings (${res.status})`);
  }
  return (await res.json()) as PublicClubSettings;
}
