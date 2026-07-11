export type ForumComment = {
  id: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  promotedTopicId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentTreeNode = ForumComment & { children: CommentTreeNode[] };

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
