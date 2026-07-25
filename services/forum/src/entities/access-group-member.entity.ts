import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'access_group_member' })
export class AccessGroupMemberEntity {
  @PrimaryColumn('uuid', { name: 'group_id' })
  groupId!: string;

  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;
}
