import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'comment_closure' })
export class CommentClosureEntity {
  @PrimaryColumn('uuid', { name: 'ancestor_id' })
  ancestorId!: string;

  @PrimaryColumn('uuid', { name: 'descendant_id' })
  descendantId!: string;

  @Column('int')
  depth!: number;
}
