export type ForumAuthor = {
  userId: string;
  displayName: string | null;
  username?: string | null;
  avatarUrl: string | null;
};

export type ForumComment = {
  id: string;
  topicId: string;
  authorId: string;
  author: ForumAuthor;
  parentId: string | null;
  body: string;
  attachments: Array<{
    url: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }>;
  promotedTopicId: string | null;
  votePlusCount?: number;
  voteMinusCount?: number;
  score?: number;
  myVote?: 1 | -1 | null;
  canChangeVote?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommentTreeNode = ForumComment & { children: CommentTreeNode[] };

export function forumAuthorLabel(author: ForumAuthor | undefined): string {
  return author?.displayName?.trim() || author?.username?.trim() || 'Участник';
}

/** Builds a nested tree from a flat comment list (parentId links). */
export function buildCommentTree(comments: ForumComment[]): CommentTreeNode[] {
  const byId = new Map<string, CommentTreeNode>();
  for (const comment of comments) {
    byId.set(comment.id, { ...comment, children: [] });
  }

  const roots: CommentTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByCreatedAt = (nodes: CommentTreeNode[]) => {
    nodes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const node of nodes) sortByCreatedAt(node.children);
  };
  sortByCreatedAt(roots);

  return roots;
}
