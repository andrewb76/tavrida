import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseForumMarkdown } from './renderForumMarkdown.js';

describe('parseForumMarkdown', () => {
  it('renders emphasis and inline code', () => {
    const html = parseForumMarkdown('**bold** and *italic* and `code`');
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /<em>italic<\/em>/);
    assert.match(html, /<code>code<\/code>/);
  });

  it('renders fenced code blocks', () => {
    const html = parseForumMarkdown('```ts\nconst x = 1;\n```');
    assert.match(html, /<pre>/);
    assert.match(html, /<code/);
    assert.match(html, /const x = 1;/);
  });

  it('renders links and images', () => {
    const html = parseForumMarkdown('[docs](https://example.com) ![alt](https://img.test/a.png)');
    assert.match(html, /<a[^>]+href="https:\/\/example.com"/);
    assert.match(html, /<img[^>]+src="https:\/\/img.test\/a.png"/);
  });

  it('renders lists and blockquotes', () => {
    const html = parseForumMarkdown('- one\n- two\n\n> quote');
    assert.match(html, /<ul>/);
    assert.match(html, /<li>one<\/li>/);
    assert.match(html, /<blockquote>/);
  });

  it('does not pass through raw HTML', () => {
    const html = parseForumMarkdown('<script>alert(1)</script>\n\n**safe**');
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /<strong>safe<\/strong>/);
  });

  it('turns single newlines into line breaks', () => {
    const html = parseForumMarkdown('line one\nline two');
    assert.match(html, /<br\s*\/?>/);
  });
});
