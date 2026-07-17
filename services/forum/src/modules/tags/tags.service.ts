import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { cleanTagLabel, slugifyTag } from '../../common/tag-slug';
import { ContentTagEntity, type ContentTagType } from '../../entities/content-tag.entity';
import { TagEntity } from '../../entities/tag.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsPublisher } from '../events/forum-events.publisher';

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
    private readonly dataSource: DataSource,
    private readonly events: ForumEventsPublisher,
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

  async findByIds(ids: string[]): Promise<TagItem[]> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (!unique.length) return [];
    const rows = await this.tags.find({
      where: { id: In(unique), isHidden: false },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return unique.map((id) => byId.get(id)).filter((r): r is TagEntity => Boolean(r)).map((r) => this.toItem(r));
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
    return this.ensureFromLabelsWithRepository(labels, this.tags);
  }

  private async ensureFromLabelsWithRepository(
    labels: string[],
    tags: Repository<TagEntity>,
  ): Promise<TagEntity[]> {
    const cleaned = [
      ...new Set(labels.map(cleanTagLabel).filter((t) => t.length > 0)),
    ].slice(0, 10);

    const result: TagEntity[] = [];
    for (const label of cleaned) {
      const slug = slugifyTag(label);
      let row = await tags.findOne({ where: { slug } });
      if (!row) {
        row = tags.create({
          id: randomUUID(),
          slug,
          displayName: label,
          description: null,
          color: null,
          isOfficial: false,
          isHidden: false,
          usageCount: 0,
        });
        await tags.save(row);
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
    const result = await this.dataSource.transaction(async (manager) => {
      const tags = manager.getRepository(TagEntity);
      const contentTags = manager.getRepository(ContentTagEntity);
      const topics = manager.getRepository(TopicEntity);
      const wanted = await this.ensureFromLabelsWithRepository(input.labels, tags);
      const wantedIds = new Set(wanted.map((tag) => tag.id));
      const existing = await contentTags.find({
        where: { contentType: 'topic', contentId: input.topicId },
      });
      const existingIds = new Set(existing.map((link) => link.tagId));
      const toRemove = existing.filter((link) => !wantedIds.has(link.tagId));
      const toAdd = wanted.filter((tag) => !existingIds.has(tag.id));

      if (toRemove.length) {
        await contentTags.remove(toRemove);
        for (const link of toRemove) {
          await tags.decrement({ id: link.tagId }, 'usageCount', 1);
        }
      }

      for (const tag of toAdd) {
        await contentTags.save(
          contentTags.create({
            tagId: tag.id,
            contentType: 'topic',
            contentId: input.topicId,
            priority: null,
            addedBy: input.addedBy,
          }),
        );
        await tags.increment({ id: tag.id }, 'usageCount', 1);
      }

      const slugs = wanted.map((tag) => tag.slug);
      await topics.update({ id: input.topicId }, { tags: slugs });
      const addedTagIds = toAdd.map((tag) => tag.id);
      await this.events.enqueueTagContentTagged(manager, {
        tagIds: addedTagIds,
        topicId: input.topicId,
        actorId: input.addedBy,
      });

      return {
        tagItems: wanted.map((tag) => this.toItem(tag)),
        slugs,
        addedTagIds,
      };
    });
    if (result.addedTagIds.length) this.events.flush();
    return result;
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
