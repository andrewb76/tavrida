import { bffAuthHeaders } from './apiAuth';

export type MediaDomain = 'auction' | 'forum' | 'marketplace' | 'chat' | 'period' | 'profile';

export type MediaAttachment = {
  id?: string;
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
  aspectWidth?: number;
  aspectHeight?: number;
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
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: await bffAuthHeaders(init?.headers),
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
    id: confirmed.uploadId,
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

// ── Attachment markdown sync ─────────────────────────────────────────

/** Extract all URLs from markdown image/link syntax (![...](url) and [...](url)). */
export function extractMarkdownUrls(body: string): string[] {
  const regex = /!?\[[^\]]*\]\(([^)]+)\)/g;
  const urls: string[] = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Ensure all attachment URLs are present in body as markdown links.
 * Adds missing ones at the end. Does not duplicate existing URLs.
 */
export function syncAttachmentMarkdown(body: string, attachments: MediaAttachment[]): string {
  if (!attachments.length) return body;

  const existingUrls = extractMarkdownUrls(body);
  const missing = attachments.filter((a) => !existingUrls.includes(a.url));
  if (!missing.length) return body;

  const markdown = missing
    .map((a) => {
      if (isImageAttachment(a)) {
        return `![${a.filename}](${a.url})`;
      }
      return `[${a.filename}](${a.url})`;
    })
    .join('\n');

  const separator = body.endsWith('\n') ? '' : '\n\n';
  return body + separator + markdown;
}

/**
 * Check whether every attachment URL is already present in the body as a markdown link.
 */
export function allAttachmentUrlsPresent(body: string, attachments: MediaAttachment[]): boolean {
  if (!attachments.length) return true;
  const existingUrls = extractMarkdownUrls(body);
  return attachments.every((a) => existingUrls.includes(a.url));
}
