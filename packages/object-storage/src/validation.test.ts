import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertMediaAttachmentsAllowed,
  assertMediaUrlsAllowed,
  buildPublicUrl,
  extractMarkdownImageUrls,
  isOwnedMediaUrl,
  mediaValidationError,
  parseMediaUrl,
} from './index';

const BASE = 'http://localhost:9000';
const USER = 'user-42';
const URL = `${BASE}/auction-images/users/${USER}/upload-1/photo.jpg`;

describe('object-storage urls', () => {
  it('buildPublicUrl uses bucket and object key', () => {
    assert.equal(
      buildPublicUrl({
        publicBaseUrl: BASE,
        domain: 'auction',
        objectKey: `users/${USER}/upload-1/photo.jpg`,
      }),
      URL,
    );
  });

  it('parseMediaUrl round-trips owned auction image', () => {
    const parsed = parseMediaUrl(URL, BASE);
    assert.deepEqual(parsed, {
      bucket: 'auction-images',
      domain: 'auction',
      userId: USER,
      uploadId: 'upload-1',
      filename: 'photo.jpg',
    });
    assert.equal(isOwnedMediaUrl(URL, USER, BASE), true);
    assert.equal(isOwnedMediaUrl(URL, 'other', BASE), false);
  });

  it('extractMarkdownImageUrls finds embedded images', () => {
    const urls = extractMarkdownImageUrls('Hi ![a](http://x/y.png) and ![b](http://z/w.jpg)');
    assert.deepEqual(urls, ['http://x/y.png', 'http://z/w.jpg']);
  });
});

describe('object-storage validation', () => {
  it('assertMediaUrlsAllowed enforces max count', () => {
    assert.throws(
      () =>
        assertMediaUrlsAllowed({
          urls: [URL, `${BASE}/auction-images/users/${USER}/u2/a.jpg`],
          userId: USER,
          domain: 'auction',
          publicBaseUrl: BASE,
          maxCount: 1,
        }),
      (err: unknown) => {
        assert.equal((err as { detail: string }).detail, 'Максимум 1 файлов');
        return true;
      },
    );
  });

  it('assertMediaAttachmentsAllowed validates attachment metadata', () => {
    assert.throws(
      () =>
        assertMediaAttachmentsAllowed({
          attachments: [
            {
              url: URL,
              filename: 'photo.jpg',
              contentType: 'image/jpeg',
              sizeBytes: 50,
            },
          ],
          userId: 'other-user',
          domain: 'auction',
          publicBaseUrl: BASE,
          maxCount: 3,
          maxSizeBytes: 1024,
        }),
      (err: ReturnType<typeof mediaValidationError>) => {
        assert.equal(err.type, 'validation');
        return true;
      },
    );
  });
});
