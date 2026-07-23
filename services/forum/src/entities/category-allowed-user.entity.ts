import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Empty set for a category ⇒ public. Non-empty ⇒ allowlist (+ platform admin on BFF). */
@Entity({ schema: 'forum', name: 'category_allowed_user' })
export class CategoryAllowedUserEntity {
  @PrimaryColumn('uuid', { name: 'category_id' })
  categoryId!: string;

  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;
}
