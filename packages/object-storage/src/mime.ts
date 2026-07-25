import type { MediaDomain } from './types';

const IMAGE_PREFIX = 'image/';

const FORUM_EXTRA = new Set(['application/pdf']);

export function isAllowedContentType(domain: MediaDomain, contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.startsWith(IMAGE_PREFIX)) return true;
  if ((domain === 'forum' || domain === 'chat') && FORUM_EXTRA.has(normalized)) return true;
  return false;
}

export function acceptAttributeForDomain(domain: MediaDomain): string {
  if (domain === 'forum' || domain === 'chat') return 'image/*,.pdf,application/pdf';
  return 'image/*';
}
