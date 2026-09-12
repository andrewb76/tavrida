import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isImageContentType,
  extractMarkdownUrls,
  syncAttachmentMarkdown,
  allAttachmentUrlsPresent,
} from './forum-media.validation';
import type { MediaAttachment } from '@tavrida/object-storage';

describe('forum-media.validation — attachment markdown sync', () => {
  const imageAttachment: MediaAttachment = {
    url: 'http://localhost:9000/forum-attachments/users/u1/img1/photo.jpg',
    filename: 'photo.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1024,
  };

  const pdfAttachment: MediaAttachment = {
    url: 'http://localhost:9000/forum-attachments/users/u1/doc1/report.pdf',
    filename: 'report.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2048,
  };

  describe('isImageContentType', () => {
    it('returns true for image types', () => {
      assert.equal(isImageContentType('image/jpeg'), true);
      assert.equal(isImageContentType('image/png'), true);
      assert.equal(isImageContentType('image/webp'), true);
    });

    it('returns false for non-image types', () => {
      assert.equal(isImageContentType('application/pdf'), false);
      assert.equal(isImageContentType('text/plain'), false);
    });
  });

  describe('extractMarkdownUrls', () => {
    it('extracts image markdown URLs', () => {
      const body = 'Hello\n\n![photo.jpg](http://example.com/img.jpg)';
      const urls = extractMarkdownUrls(body);
      assert.deepEqual(urls, ['http://example.com/img.jpg']);
    });

    it('extracts link markdown URLs', () => {
      const body = 'See [report.pdf](http://example.com/doc.pdf)';
      const urls = extractMarkdownUrls(body);
      assert.deepEqual(urls, ['http://example.com/doc.pdf']);
    });

    it('extracts mixed image and link URLs', () => {
      const body = '![img](http://a.com/1.jpg)\n[file](http://b.com/2.pdf)';
      const urls = extractMarkdownUrls(body);
      assert.deepEqual(urls, ['http://a.com/1.jpg', 'http://b.com/2.pdf']);
    });

    it('returns empty array for body without markdown links', () => {
      assert.deepEqual(extractMarkdownUrls('Hello world'), []);
      assert.deepEqual(extractMarkdownUrls(''), []);
    });
  });

  describe('syncAttachmentMarkdown', () => {
    it('adds image attachment as markdown image at end', () => {
      const result = syncAttachmentMarkdown('Hello world', [imageAttachment]);
      assert.ok(result.includes('Hello world'));
      assert.ok(result.includes('![photo.jpg](http://localhost:9000/forum-attachments/users/u1/img1/photo.jpg)'));
    });

    it('adds PDF attachment as markdown link at end', () => {
      const result = syncAttachmentMarkdown('Hello world', [pdfAttachment]);
      assert.ok(result.includes('[report.pdf](http://localhost:9000/forum-attachments/users/u1/doc1/report.pdf)'));
    });

    it('adds mixed attachments', () => {
      const result = syncAttachmentMarkdown('Body', [imageAttachment, pdfAttachment]);
      assert.ok(result.includes('![photo.jpg]'));
      assert.ok(result.includes('[report.pdf]'));
    });

    it('does not duplicate existing URLs', () => {
      const body = `Hello\n\n![photo.jpg](${imageAttachment.url})`;
      const result = syncAttachmentMarkdown(body, [imageAttachment]);
      assert.equal(result, body);
    });

    it('adds only missing URLs', () => {
      const body = `Hello\n\n![photo.jpg](${imageAttachment.url})`;
      const result = syncAttachmentMarkdown(body, [imageAttachment, pdfAttachment]);
      assert.ok(result.includes('![photo.jpg]'));
      assert.ok(result.includes('[report.pdf]'));
      // The original image URL should not be duplicated — only one occurrence of the full URL
      const urlCount = (result.split(imageAttachment.url).length - 1);
      assert.equal(urlCount, 1);
    });

    it('returns body unchanged for empty attachments', () => {
      assert.equal(syncAttachmentMarkdown('Hello', []), 'Hello');
    });

    it('handles body ending with newline', () => {
      const result = syncAttachmentMarkdown('Hello\n', [imageAttachment]);
      // Body ends with \n → no extra \n added as separator, just the markdown
      assert.ok(result.startsWith('Hello\n'));
      assert.ok(result.includes('![photo.jpg]'));
      assert.ok(!result.includes('\n\n\n'));
    });

    it('handles body not ending with newline', () => {
      const result = syncAttachmentMarkdown('Hello', [imageAttachment]);
      assert.ok(result.includes('Hello\n\n'));
    });
  });

  describe('allAttachmentUrlsPresent', () => {
    it('returns true for empty attachments', () => {
      assert.equal(allAttachmentUrlsPresent('Any body', []), true);
    });

    it('returns true when all URLs are present', () => {
      const body = `![photo.jpg](${imageAttachment.url})\n[file](${pdfAttachment.url})`;
      assert.equal(allAttachmentUrlsPresent(body, [imageAttachment, pdfAttachment]), true);
    });

    it('returns false when some URLs are missing', () => {
      const body = `![photo.jpg](${imageAttachment.url})`;
      assert.equal(allAttachmentUrlsPresent(body, [imageAttachment, pdfAttachment]), false);
    });

    it('returns false when no URLs are present', () => {
      assert.equal(allAttachmentUrlsPresent('Hello', [imageAttachment]), false);
    });
  });
});
