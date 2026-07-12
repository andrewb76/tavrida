import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCommentTree, type ForumComment } from './forum-tree.js';

function comment(
  partial: Partial<ForumComment> & Pick<ForumComment, 'id' | 'body'>,
): ForumComment {
  const authorId = partial.authorId ?? 'user-1';
  return {
    topicId: 'topic-1',
    authorId,
    author: partial.author ?? { userId: authorId, displayName: 'Участник', avatarUrl: null },
    parentId: null,
    attachments: [],
    promotedTopicId: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...partial,
  };
}

describe('buildCommentTree', () => {
  it('returns flat roots when no parentId', () => {
    const tree = buildCommentTree([
      comment({ id: 'a', body: 'A', createdAt: '2026-01-01T10:00:00.000Z' }),
      comment({ id: 'b', body: 'B', createdAt: '2026-01-01T11:00:00.000Z' }),
    ]);

    assert.equal(tree.length, 2);
    assert.equal(tree[0]?.id, 'a');
    assert.equal(tree[1]?.id, 'b');
    assert.equal(tree[0]?.children.length, 0);
  });

  it('nests replies under parent comments', () => {
    const tree = buildCommentTree([
      comment({ id: 'root', body: 'Root' }),
      comment({ id: 'reply', body: 'Reply', parentId: 'root', createdAt: '2026-01-01T11:00:00.000Z' }),
    ]);

    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.id, 'root');
    assert.equal(tree[0]?.children.length, 1);
    assert.equal(tree[0]?.children[0]?.id, 'reply');
  });

  it('supports arbitrary nesting depth', () => {
    const tree = buildCommentTree([
      comment({ id: 'l1', body: 'Level 1' }),
      comment({ id: 'l2', body: 'Level 2', parentId: 'l1', createdAt: '2026-01-01T11:00:00.000Z' }),
      comment({ id: 'l3', body: 'Level 3', parentId: 'l2', createdAt: '2026-01-01T12:00:00.000Z' }),
    ]);

    assert.equal(tree[0]?.children[0]?.children[0]?.id, 'l3');
  });

  it('treats missing parent as root', () => {
    const tree = buildCommentTree([
      comment({ id: 'orphan', body: 'Orphan', parentId: 'missing' }),
    ]);

    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.id, 'orphan');
  });

  it('sorts siblings by createdAt ascending', () => {
    const tree = buildCommentTree([
      comment({ id: 'root', body: 'Root' }),
      comment({ id: 'late', body: 'Late', parentId: 'root', createdAt: '2026-01-01T12:00:00.000Z' }),
      comment({ id: 'early', body: 'Early', parentId: 'root', createdAt: '2026-01-01T11:00:00.000Z' }),
    ]);

    assert.deepEqual(
      tree[0]?.children.map((node: { id: string }) => node.id),
      ['early', 'late'],
    );
  });
});
