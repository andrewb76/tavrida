import { requireBearerToken } from './apiAuth';

export type MediaDomain = 'auction' | 'forum' | 'marketplace';

export type MediaAttachment = {
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type MediaLimits = {
  countMax: number;
  sizeMaxMb: number;
  sizeMaxBytes: number;
  accept: string;
};

export type UploadIntentResponse = {
  uploadId: string;
  presignedPutUrl: string;
  publicUrl: string;
  expiresAt: string;
};

export type ConfirmedUpload = {
  uploadId: string;
  status: string;
  publicUrl: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  confirmedAt: string | null;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function authJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? 'Ошибка загрузки медиа');
  }
  return (await res.json()) as T;
}

export async function getMediaLimits(domain: MediaDomain): Promise<MediaLimits> {
  return authJson<MediaLimits>(`/media/limits?domain=${encodeURIComponent(domain)}`);
}

export async function createUploadIntent(input: {
  domain: MediaDomain;
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<UploadIntentResponse> {
  return authJson<UploadIntentResponse>('/media/upload-intents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function confirmUploadIntent(uploadId: string): Promise<ConfirmedUpload> {
  return authJson<ConfirmedUpload>(`/media/upload-intents/${encodeURIComponent(uploadId)}/confirm`, {
    method: 'POST',
  });
}

export async function uploadFile(domain: MediaDomain, file: File): Promise<MediaAttachment> {
  const intent = await createUploadIntent({
    domain,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });

  const putRes = await fetch(intent.presignedPutUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '');
    const s3Message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
    const detail = s3Message ?? (body.trim() || `HTTP ${putRes.status}`);
    throw new Error(`Не удалось загрузить файл: ${file.name} (${detail})`);
  }

  const confirmed = await confirmUploadIntent(intent.uploadId);
  return {
    url: confirmed.publicUrl,
    filename: confirmed.filename,
    contentType: confirmed.contentType,
    sizeBytes: confirmed.sizeBytes,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageAttachment(attachment: MediaAttachment): boolean {
  return attachment.contentType.startsWith('image/');
}
