import { bucketForDomain, domainForBucket } from './buckets';
import { buildObjectKey } from './paths';
import type { MediaDomain } from './types';

export function normalizePublicBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function buildPublicUrl(input: {
  publicBaseUrl: string;
  domain: MediaDomain;
  objectKey: string;
}): string {
  const base = normalizePublicBaseUrl(input.publicBaseUrl);
  const bucket = bucketForDomain(input.domain);
  const key = input.objectKey.replace(/^\/+/, '');
  return `${base}/${bucket}/${key}`;
}

export type ParsedMediaUrl = {
  bucket: string;
  domain: MediaDomain;
  userId: string;
  uploadId: string;
  filename: string;
};

export function parseMediaUrl(url: string, publicBaseUrl: string): ParsedMediaUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const base = normalizePublicBaseUrl(publicBaseUrl);
  let baseUrl: URL;
  try {
    baseUrl = new URL(base);
  } catch {
    return null;
  }

  if (parsed.origin !== baseUrl.origin) return null;

  const basePath = baseUrl.pathname.replace(/\/+$/, '');
  const fullPath = parsed.pathname;
  const relative =
    basePath && fullPath.startsWith(basePath)
      ? fullPath.slice(basePath.length).replace(/^\/+/, '')
      : fullPath.replace(/^\/+/, '');

  const segments = relative.split('/').filter(Boolean);
  if (segments.length < 4) return null;

  const [bucket, usersSegment, userId, uploadId, ...filenameParts] = segments;
  if (usersSegment !== 'users' || !userId || !uploadId) return null;

  const domain = domainForBucket(bucket);
  if (!domain) return null;

  const filename = filenameParts.join('/');
  if (!filename) return null;

  return { bucket, domain, userId, uploadId, filename };
}

export function isOwnedMediaUrl(url: string, userId: string, publicBaseUrl: string): boolean {
  const parsed = parseMediaUrl(url, publicBaseUrl);
  return parsed?.userId === userId;
}

export function extractMarkdownImageUrls(body: string): string[] {
  const urls: string[] = [];
  const pattern = /!\[[^\]]*]\(([^)]+)\)/g;
  for (const match of body.matchAll(pattern)) {
    const raw = match[1]?.trim();
    if (raw) urls.push(raw);
  }
  return urls;
}

export function objectKeyFromPublicUrl(url: string, publicBaseUrl: string): string | null {
  const parsed = parseMediaUrl(url, publicBaseUrl);
  if (!parsed) return null;
  return buildObjectKey({
    userId: parsed.userId,
    uploadId: parsed.uploadId,
    filename: parsed.filename,
  });
}
