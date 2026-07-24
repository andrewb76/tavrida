import { Entity, PrimaryColumn } from 'typeorm';

/** Category ↔ group link. Empty set for a category ⇒ public. Non-empty ⇒ OR membership. */
@Entity({ schema: 'forum', name: 'category_access_group' })
export class CategoryAccessGroupEntity {
  @PrimaryColumn('uuid', { name: 'category_id' })
  categoryId!: string;

  @PrimaryColumn('uuid', { name: 'group_id' })
  groupId!: string;
}
