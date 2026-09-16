import { Injectable } from '@nestjs/common';
import { ForumClient } from './forum.client';
import { UserProfileClient } from '../user-profile/user-profile.client';

export type AccessGroupMemberDetails = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  lastSeenAt: string | null;
};

@Injectable()
export class AdminForumService {
  constructor(
    private readonly forum: ForumClient,
    private readonly userProfile: UserProfileClient,
  ) {}

  async getMembersWithDetails(groupId: string): Promise<{
    groupId: string;
    members: AccessGroupMemberDetails[];
  }> {
    const { userIds } = await this.forum.getAccessGroupMembers(groupId);

    if (!userIds.length) {
      return { groupId, members: [] };
    }

    const profiles = await this.userProfile.lookupByIds(userIds);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const members: AccessGroupMemberDetails[] = userIds.map((userId) => {
      const profile = profileMap.get(userId);
      return {
        userId,
        displayName: profile?.displayName ?? null,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        lastSeenAt: profile?.lastSeenAt ?? null,
      };
    });

    return { groupId, members };
  }
}
