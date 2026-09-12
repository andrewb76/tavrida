import { BadRequestException } from '@nestjs/common';
import {
  assertMarkdownMediaUrlsAllowed,
  assertMediaAttachmentsAllowed,
  mediaValidationError,
  type MediaAttachment,
} from '@tavrida/object-storage';

export type ForumMediaContext = {
  authorId: string;
  publicBaseUrl: string;
  maxAttachmentCount: number;
  maxAttachmentSizeBytes: number;
};

export function validateForumContent(input: {
  body: string;
  attachments?: MediaAttachment[];
  media: ForumMediaContext;
}): void {
  const attachments = input.attachments ?? [];

  try {
    assertMediaAttachmentsAllowed({
      attachments,
      userId: input.media.authorId,
      domain: 'forum',
      publicBaseUrl: input.media.publicBaseUrl,
      maxCount: input.media.maxAttachmentCount,
      maxSizeBytes: input.media.maxAttachmentSizeBytes,
    });
    if (input.body.includes('![')) {
      assertMarkdownMediaUrlsAllowed({
        body: input.body,
        userId: input.media.authorId,
        domain: 'forum',
        publicBaseUrl: input.media.publicBaseUrl,
      });
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'detail' in err) {
      throw new BadRequestException(err);
    }
    throw new BadRequestException(mediaValidationError('Недопустимые вложения'));
  }
}

// ── Attachment markdown sync ─────────────────────────────────────────

/** Check if a content type represents an image. */
export function isImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/');
}

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

/** Build markdown lines for attachments: images as ![](url), files as [name](url). */
function buildAttachmentMarkdownLines(attachments: MediaAttachment[]): string[] {
  return attachments.map((a) => {
    if (isImageContentType(a.contentType)) {
      return `![${a.filename}](${a.url})`;
    }
    return `[${a.filename}](${a.url})`;
  });
}

/**
 * Ensure all attachment URLs are present in body as markdown links.
 * Adds missing ones at the end. Does not duplicate existing URLs.
 * Returns the updated body string.
 */
export function syncAttachmentMarkdown(body: string, attachments: MediaAttachment[]): string {
  if (!attachments.length) return body;

  const existingUrls = extractMarkdownUrls(body);
  const missing = attachments.filter((a) => !existingUrls.includes(a.url));
  if (!missing.length) return body;

  const markdown = buildAttachmentMarkdownLines(missing).join('\n');
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
