import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildImageProxyUrl,
  encodeImgproxyPlainSource,
  rewriteMediaUrlForProxyFetch,
} from './image-proxy';

const PUBLIC_BASE = 'http://localhost:9000';
const FETCH_BASE = 'http://minio:9000';
const PROXY_BASE = 'http://localhost:8080';
const USER = 'user-42';
const SOURCE_URL = `${PUBLIC_BASE}/forum-attachments/users/${USER}/upload-1/photo.jpg`;

describe('image-proxy', () => {
  it('encodeImgproxyPlainSource uses url-safe base64', () => {
    const encoded = encodeImgproxyPlainSource('http://minio:9000/bucket/key.jpg');
    assert.equal(encoded.includes('+'), false);
    assert.equal(encoded.includes('/'), false);
    assert.equal(encoded.endsWith('='), false);
  });

  it('rewriteMediaUrlForProxyFetch swaps origin for docker MinIO', () => {
    assert.equal(
      rewriteMediaUrlForProxyFetch(SOURCE_URL, PUBLIC_BASE, FETCH_BASE),
      `${FETCH_BASE}/forum-attachments/users/${USER}/upload-1/photo.jpg`,
    );
  });

  it('rewriteMediaUrlForProxyFetch rejects non-owned URLs', () => {
    assert.equal(
      rewriteMediaUrlForProxyFetch('https://cdn.example.com/avatar.png', PUBLIC_BASE, FETCH_BASE),
      null,
    );
  });

  it('buildImageProxyUrl encodes resize options', () => {
    const url = buildImageProxyUrl(
      {
        baseUrl: PROXY_BASE,
        publicBaseUrl: PUBLIC_BASE,
        fetchBaseUrl: FETCH_BASE,
      },
      SOURCE_URL,
      { width: 96, height: 96, resizingType: 'fit' },
    );

    assert.ok(url);
    assert.match(url!, /^http:\/\/localhost:8080\/insecure\/rs:fit:96:96\/[A-Za-z0-9_-]+\.jpg$/);
  });

  it('buildImageProxyUrl returns null without proxy base', () => {
    assert.equal(
      buildImageProxyUrl(
        {
          baseUrl: '',
          publicBaseUrl: PUBLIC_BASE,
          fetchBaseUrl: FETCH_BASE,
        },
        SOURCE_URL,
      ),
      null,
    );
  });
});
