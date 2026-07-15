import { Injectable, Logger } from '@nestjs/common';
import { LogtoManagementService } from '../logto/logto-management.service';
import { UserProfileClient } from '../user-profile/user-profile.client';

export type ForumAuthorPreview = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

@Injectable()
export class ForumAuthorsService {
  private readonly logger = new Logger(ForumAuthorsService.name);

  constructor(
    private readonly profiles: UserProfileClient,
    private readonly logto: LogtoManagementService,
  ) {}

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
      const result = await this.profiles.lookupByIds(unique);
      const rows = Array.isArray(result)
        ? result
        : Array.isArray((result as { data?: unknown }).data)
          ? ((result as {
              data: Array<{
                userId: string;
                displayName: string | null;
                username?: string | null;
                avatarUrl: string | null;
              }>;
            }).data ?? [])
          : [];
      for (const row of rows) {
        map.set(row.userId, {
          userId: row.userId,
          displayName: row.displayName,
          username: row.username ?? null,
          avatarUrl: row.avatarUrl,
        });
      }
    } catch (error) {
      this.logger.warn(
        `profile lookup failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    const needsBackfill = unique.filter((userId) => {
      const row = map.get(userId);
      if (!row) return true;
      return !row.displayName?.trim() && !row.username?.trim() && !row.avatarUrl?.trim();
    });

    if (needsBackfill.length && this.logto.isConfigured) {
      await Promise.all(
        needsBackfill.map(async (userId) => {
          try {
            const logtoUser = await this.logto.getUser(userId);
            if (!logtoUser) {
              if (!map.has(userId)) map.set(userId, this.fallbackAuthor(userId));
              return;
            }

            await this.profiles.syncFromLogto({
              userId,
              name: logtoUser.name,
              username: logtoUser.username,
              primaryEmail: logtoUser.primaryEmail,
              avatar: logtoUser.avatar,
            });

            map.set(userId, {
              userId,
              displayName: logtoUser.name?.trim() || logtoUser.username?.trim() || null,
              username: logtoUser.username,
              avatarUrl: logtoUser.avatar,
            });
          } catch (error) {
            this.logger.warn(
              `logto backfill failed for ${userId}: ${
                error instanceof Error ? error.message : error
              }`,
            );
            if (!map.has(userId)) map.set(userId, this.fallbackAuthor(userId));
          }
        }),
      );
    }

    for (const userId of unique) {
      if (!map.has(userId)) {
        map.set(userId, this.fallbackAuthor(userId));
      }
    }

    return map;
  }

  private fallbackAuthor(userId: string): ForumAuthorPreview {
    return { userId, displayName: null, username: null, avatarUrl: null };
  }
}
