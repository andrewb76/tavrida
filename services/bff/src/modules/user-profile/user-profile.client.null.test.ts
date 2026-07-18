import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Mirrors UserProfileClient empty-body handling for `return null` upstreams.
 * Nest may emit an empty 200 body instead of JSON `null`.
 */
function parseUpstreamBody(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;
  return JSON.parse(text) as unknown;
}

describe('user-profile client null body', () => {
  it('treats empty body as null note', () => {
    assert.equal(parseUpstreamBody(''), null);
    assert.equal(parseUpstreamBody('   '), null);
  });

  it('parses explicit JSON null', () => {
    assert.equal(parseUpstreamBody('null'), null);
  });

  it('parses note object', () => {
    const note = parseUpstreamBody(
      JSON.stringify({ id: '1', ownerId: 'a', authorId: 'b', text: 'hi' }),
    ) as { text: string };
    assert.equal(note.text, 'hi');
  });
});
