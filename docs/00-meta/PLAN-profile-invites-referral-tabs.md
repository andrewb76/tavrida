# Plan: Profile — Invites & Referral Tree Tabs

## Goal
Move invite-related UI and referral tree from Overview tab into dedicated tabs. Remove the standalone ReferralTreeView page.

## Files to modify/create

| Action | File |
|--------|------|
| **Modify** | `apps/frontend/src/components/profile/ProfileTabs.vue` |
| **Create** | `apps/frontend/src/components/profile/ProfileInvitesTab.vue` |
| **Create** | `apps/frontend/src/components/profile/ProfileReferralTreeTab.vue` |
| **Modify** | `apps/frontend/src/views/member/ProfileView.vue` |
| **Delete** | `apps/frontend/src/views/member/ReferralTreeView.vue` |
| **Modify** | `apps/frontend/src/router/routes.ts` (remove `referral-tree` route) |
| **Modify** | `docs/11-ux-ui/wireframes/profile-wireframe.md` |

## 1. `ProfileTabs.vue` — add two new tabs

- Extend `ProfileTab` type: `'overview' | 'posts' | 'comments' | 'activity' | 'invites' | 'referral-tree'`
- Add tabs: `{ id: 'invites', label: 'Инвайты' }`, `{ id: 'referral-tree', label: 'Реферальное дерево' }`
- Tabs are rendered unconditionally in the nav; parent controls which slot content to show (or hides via `v-if`)

## 2. `ProfileInvitesTab.vue` — new component

Extract from `ProfileView.vue` Overview tab (lines 562–663):

**Props:**
- `userId: string` — profile user ID
- `isOwner: boolean` — whether this is the current user's profile (controls form visibility)
- `isAdmin: boolean` — platform admin (sees invites on any profile)

**Content:**
- Invite creation form (email input + "Создать инвайт" button) — shown only if `isOwner || isAdmin`
- Login prompt if not authenticated
- Last created invite link + copy button + expiry
- Invite history list (last 5)
- Empty state when no invites

**State/functions moved from ProfileView:**
- `loading`, `inviteEmail`, `inviteError`, `lastCreated`, `history`
- `create()`, `copyInviteLink()`, `refreshHistory()`, `inviteErrorMessage()`
- `canCreateInvite` computed
- `onMounted` → `refreshHistory()`

## 3. `ProfileReferralTreeTab.vue` — new component

Embed the L1/L2 referral list inline (same data as current `ReferralTreeView.vue`).

**Props:**
- `userId: string`

**Content:**
- Loading/error states
- "Приглашённые (N)" section with avatar + name links (L1)
- "Приглашены приглашёнными (N)" section (L2)
- Empty state

**Data:** `fetchReferralTree(userId)` → `ReferralUser[]`, filtered by `level === 1 | 2`

Reuse styles from current `ReferralTreeView.vue` (`.ref-tree__*` classes).

## 4. `ProfileView.vue` — cleanup

**Remove from Overview tab (isMe):**
- Lines 562–663: invite form, referral tree link, invite history
- Imports: `createInvite`, `listInvites`, `CreatedInvite`, `InviteRecord`
- State: `loading`, `inviteEmail`, `inviteError`, `lastCreated`, `history`
- Functions: `create()`, `copyInviteLink()`, `refreshHistory()`, `inviteErrorMessage()`
- `canCreateInvite` computed

**Remove from Activity tab (both isMe and public):**
- Referral tree `<RouterLink>` (lines 677–683, 824–829)

**Add slot content:**
```vue
<template #invites>
  <ProfileInvitesTab
    v-if="profileIdForTabs"
    :user-id="profileIdForTabs"
    :is-owner="isMe"
    :is-admin="session.isAdmin"
  />
</template>

<template #referral-tree>
  <ProfileReferralTreeTab
    v-if="profileIdForTabs"
    :user-id="profileIdForTabs"
  />
</template>
```

**Tab visibility logic:**
- "Инвайты" tab content: always rendered (component handles empty state for non-owners)
- "Реферальное дерево" tab: always visible (works for any profile)

## 5. Delete `ReferralTreeView.vue` + remove route

- Delete `apps/frontend/src/views/member/ReferralTreeView.vue`
- In `apps/frontend/src/router/routes.ts`: remove the `referral-tree` route entry (lines 96-100)
- In `apps/frontend/src/views/admin/AdminUsersView.vue:770`: update link from `{ name: 'referral-tree', params: { userId } }` to `{ name: 'profile-user', params: { userId } }` (admin navigates to profile, clicks "Реферальное дерево" tab)
- All 4 `ProfileView.vue` referral-tree links are removed as part of step 4 cleanup

## 6. Update docs

- `docs/11-ux-ui/wireframes/profile-wireframe.md`: update tab list, remove standalone referral tree page reference

## Verification

1. `npx vue-tsc --noEmit` — TypeScript clean
2. `node_modules/.bin/eslint apps/frontend/src/components/profile/ProfileInvitesTab.vue apps/frontend/src/components/profile/ProfileReferralTreeTab.vue apps/frontend/src/views/member/ProfileView.vue` — lint clean
3. `npx vite build` — frontend builds
4. Manual: profile page shows 6 tabs (Overview, Posts, Comments, Activity, Invites, Referral Tree)
5. Manual: Invites tab shows form only for owner/admin
6. Manual: Referral Tree tab shows L1/L2 list inline
7. Manual: `/profile/:id/referrals` route returns 404 (removed)
