import { Injectable } from '@nestjs/common';
import { UserProfileClient } from '../user-profile/user-profile.client';

export type ForumAuthorPreview = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

@Injectable()
export class ForumAuthorsService {
  constructor(private readonly profiles: UserProfileClient) {}

  async enrichOne<T extends { authorId: string }>(item: T): Promise<T & { author: ForumAuthorPreview }> {
    const [enriched] = await this.enrichMany([item]);
    return enriched;
  }

  async enrichMany<T extends { authorId: string }>(
    items: T[],
  ): Promise<Array<T & { author: ForumAuthorPreview }>> {
    if (!items.length) return [];

    const authors = await this.resolveAuthors(items.map((item) => item.authorId));
    return items.map((item) => ({
      ...item,
      author: authors.get(item.authorId) ?? this.fallbackAuthor(item.authorId),
    }));
  }

  private async resolveAuthors(authorIds: string[]) {
    const unique = [...new Set(authorIds.filter(Boolean))];
    const map = new Map<string, ForumAuthorPreview>();

    try {
      const rows = await this.profiles.lookupByIds(unique);
      for (const row of rows) {
        map.set(row.userId, {
          userId: row.userId,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
        });
      }
    } catch {
      /* forum still works without profile enrichment */
    }

    for (const userId of unique) {
      if (!map.has(userId)) {
        map.set(userId, this.fallbackAuthor(userId));
      }
    }

    return map;
  }

  private fallbackAuthor(userId: string): ForumAuthorPreview {
    return { userId, displayName: null, avatarUrl: null };
  }
}
