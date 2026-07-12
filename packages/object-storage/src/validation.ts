import { isAllowedContentType } from './mime';
import { extractMarkdownImageUrls, isOwnedMediaUrl } from './urls';
import type { MediaAttachment, MediaDomain } from './types';

export type MediaValidationError = {
  type: 'validation';
  detail: string;
};

export function mediaValidationError(detail: string): MediaValidationError {
  return { type: 'validation', detail };
}

export function normalizeCountLimit(limit: number | null | undefined, fallback: number): number {
  if (limit === -1) return 999;
  if (limit == null) return fallback;
  return Math.max(0, limit);
}

export function sizeLimitToBytes(sizeMaxMb: number | null | undefined, fallbackMb: number): number {
  const mb = sizeMaxMb == null || sizeMaxMb <= 0 ? fallbackMb : sizeMaxMb;
  return mb * 1024 * 1024;
}

export function assertMediaUrlsAllowed(input: {
  urls: string[];
  userId: string;
  domain: MediaDomain;
  publicBaseUrl: string;
  maxCount: number;
}): void {
  const unique = [...new Set(input.urls)];
  if (unique.length > input.maxCount) {
    throw mediaValidationError(`Максимум ${input.maxCount} файлов`);
  }

  for (const url of unique) {
    if (!isOwnedMediaUrl(url, input.userId, input.publicBaseUrl)) {
      throw mediaValidationError('Недопустимый URL медиафайла');
    }
  }
}

export function assertMediaAttachmentsAllowed(input: {
  attachments: MediaAttachment[];
  userId: string;
  domain: MediaDomain;
  publicBaseUrl: string;
  maxCount: number;
  maxSizeBytes: number;
}): void {
  if (input.attachments.length > input.maxCount) {
    throw mediaValidationError(`Максимум ${input.maxCount} вложений`);
  }

  const seen = new Set<string>();
  for (const attachment of input.attachments) {
    if (seen.has(attachment.url)) continue;
    seen.add(attachment.url);

    if (!isOwnedMediaUrl(attachment.url, input.userId, input.publicBaseUrl)) {
      throw mediaValidationError(`Недопустимый URL вложения: ${attachment.filename}`);
    }
    if (!isAllowedContentType(input.domain, attachment.contentType)) {
      throw mediaValidationError(`Недопустимый тип файла: ${attachment.filename}`);
    }
    if (attachment.sizeBytes < 1 || attachment.sizeBytes > input.maxSizeBytes) {
      throw mediaValidationError(`Размер файла вне лимита: ${attachment.filename}`);
    }
    if (!attachment.filename.trim()) {
      throw mediaValidationError('Имя файла обязательно');
    }
  }
}

export function assertMarkdownMediaUrlsAllowed(input: {
  body: string;
  userId: string;
  domain: MediaDomain;
  publicBaseUrl: string;
}): void {
  const urls = extractMarkdownImageUrls(input.body);
  assertMediaUrlsAllowed({
    urls,
    userId: input.userId,
    domain: input.domain,
    publicBaseUrl: input.publicBaseUrl,
    maxCount: urls.length,
  });
}
