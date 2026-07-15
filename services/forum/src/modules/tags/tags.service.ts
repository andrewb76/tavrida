import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { ILike, In, Repository } from 'typeorm';
import { cleanTagLabel, slugifyTag } from '../../common/tag-slug';
import { ContentTagEntity, type ContentTagType } from '../../entities/content-tag.entity';
import { TagEntity } from '../../entities/tag.entity';
import { TopicEntity } from '../../entities/topic.entity';

export type TagItem = {
  id: string;
  slug: string;
  displayName: string;
  isOfficial: boolean;
};

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tags: Repository<TagEntity>,
    @InjectRepository(ContentTagEntity)
    private readonly contentTags: Repository<ContentTagEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
  ) {}

  toItem(row: TagEntity): TagItem {
    return {
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      isOfficial: row.isOfficial,
    };
  }

  async search(input: { q?: string; limit?: number }) {
    const take = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const q = input.q?.trim();
    const rows = await this.tags.find({
      where: q
        ? [
            { slug: ILike(`%${q}%`), isHidden: false },
            { displayName: ILike(`%${q}%`), isHidden: false },
          ]
        : { isHidden: false },
      order: { usageCount: 'DESC', displayName: 'ASC' },
      take,
    });
    return { data: rows.map((row) => this.toItem(row)) };
  }

  async getBySlug(slug: string) {
    const row = await this.tags.findOne({ where: { slug } });
    if (!row || row.isHidden) {
      throw new NotFoundException({ type: 'not-found', detail: `Tag ${slug} not found` });
    }
    const links = await this.contentTags.find({
      where: { tagId: row.id, contentType: 'topic' },
      take: 50,
      order: { createdAt: 'DESC' },
    });
    return {
      ...this.toItem(row),
      description: row.description,
      usageCount: row.usageCount,
      topicIds: links.map((l) => l.contentId),
    };
  }

  async listForContent(contentType: ContentTagType, contentId: string): Promise<TagItem[]> {
    const links = await this.contentTags.find({ where: { contentType, contentId } });
    if (!links.length) return [];
    const rows = await this.tags.find({ where: { id: In(links.map((l) => l.tagId)) } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return links
      .map((l) => byId.get(l.tagId))
      .filter((r): r is TagEntity => Boolean(r))
      .map((r) => this.toItem(r));
  }

  /** Resolve labels → Tag rows (create missing non-official). */
  async ensureFromLabels(labels: string[]): Promise<TagEntity[]> {
    const cleaned = [
      ...new Set(labels.map(cleanTagLabel).filter((t) => t.length > 0)),
    ].slice(0, 10);

    const result: TagEntity[] = [];
    for (const label of cleaned) {
      const slug = slugifyTag(label);
      let row = await this.tags.findOne({ where: { slug } });
      if (!row) {
        row = this.tags.create({
          id: randomUUID(),
          slug,
          displayName: label,
          description: null,
          color: null,
          isOfficial: false,
          isHidden: false,
          usageCount: 0,
        });
        await this.tags.save(row);
      }
      result.push(row);
    }
    return result;
  }

  /**
   * Replace topic ContentTag set; keep `topic.tags` jsonb in sync (slugs).
   * Returns added tagIds for future `tag.content_tagged` fan-out.
   */
  async replaceTopicTags(input: {
    topicId: string;
    addedBy: string;
    labels: string[];
  }): Promise<{ tagItems: TagItem[]; slugs: string[]; addedTagIds: string[] }> {
    const wanted = await this.ensureFromLabels(input.labels);
    const wantedIds = new Set(wanted.map((t) => t.id));

    const existing = await this.contentTags.find({
      where: { contentType: 'topic', contentId: input.topicId },
    });
    const existingIds = new Set(existing.map((e) => e.tagId));

    const toRemove = existing.filter((e) => !wantedIds.has(e.tagId));
    const toAdd = wanted.filter((t) => !existingIds.has(t.id));

    if (toRemove.length) {
      await this.contentTags.remove(toRemove);
      for (const link of toRemove) {
        await this.tags.decrement({ id: link.tagId }, 'usageCount', 1);
      }
    }

    for (const tag of toAdd) {
      await this.contentTags.save(
        this.contentTags.create({
          tagId: tag.id,
          contentType: 'topic',
          contentId: input.topicId,
          priority: null,
          addedBy: input.addedBy,
        }),
      );
      await this.tags.increment({ id: tag.id }, 'usageCount', 1);
    }

    const slugs = wanted.map((t) => t.slug);
    await this.topics.update({ id: input.topicId }, { tags: slugs });

    return {
      tagItems: wanted.map((t) => this.toItem(t)),
      slugs,
      addedTagIds: toAdd.map((t) => t.id),
    };
  }

  /** One-shot: jsonb labels absent from content_tag → formalize. */
  async syncLegacyTopic(topic: TopicEntity): Promise<TagItem[]> {
    const formal = await this.listForContent('topic', topic.id);
    if (formal.length) return formal;
    const legacy = topic.tags ?? [];
    if (!legacy.length) return [];
    const { tagItems } = await this.replaceTopicTags({
      topicId: topic.id,
      addedBy: topic.authorId,
      labels: legacy,
    });
    return tagItems;
  }
}
