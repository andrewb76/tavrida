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
