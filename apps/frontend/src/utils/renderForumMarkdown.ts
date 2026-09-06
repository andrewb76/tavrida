import MarkdownIt from 'markdown-it';
import DOMPurify, { type Config } from 'dompurify';
import { imageProxyPresets, proxiedMediaUrl } from './imageProxy.js';
import type { ImageProxyResize } from '@tavrida/object-storage';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    's',
    'del',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'start', 'colspan', 'rowspan'],
};

let hooksInstalled = false;

function ensureSanitizeHooks() {
  if (hooksInstalled || typeof window === 'undefined') return;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'nofollow noopener noreferrer');
      const href = node.getAttribute('href');
      if (href && /^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank');
      }
    }

    if (node.tagName === 'IMG') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
    }
  });

  hooksInstalled = true;
}

/** Rewrites owned MinIO image src attributes in rendered forum HTML. */
export function rewriteOwnedMediaImagesInHtml(
  html: string,
  resize: ImageProxyResize = imageProxyPresets.markdownImage,
): string {
  if (!html) return html;

  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (match, prefix, src, suffix) => {
    const proxied = proxiedMediaUrl(src, resize);
    return proxied && proxied !== src ? `${prefix}${proxied}${suffix}` : match;
  });
}

/** Parses forum markdown to HTML. Used in tests and before sanitization. */
export function parseForumMarkdown(body: string): string {
  if (!body.trim()) return '';
  return markdown.render(body);
}

/** Sanitizes rendered HTML for safe `v-html` usage in the forum. */
export function sanitizeForumHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html;

  ensureSanitizeHooks();
  return String(DOMPurify.sanitize(html, SANITIZE_CONFIG));
}

export function renderForumMarkdown(
  body: string,
  imageResize?: ImageProxyResize,
): string {
  return rewriteOwnedMediaImagesInHtml(sanitizeForumHtml(parseForumMarkdown(body)), imageResize);
}
