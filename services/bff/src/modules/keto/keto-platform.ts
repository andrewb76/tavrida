import type { PlatformRole } from './keto.service';

export type PlatformRelation = Exclude<PlatformRole, 'member'>;

export type KetoTupleConfig = {
  namespace: string;
  object: string;
};

export function buildPlatformTuple(
  config: KetoTupleConfig,
  userId: string,
  relation: PlatformRelation,
) {
  return {
    namespace: config.namespace,
    object: config.object,
    relation,
    subject_id: `user:${userId}`,
  };
}

export function buildPlatformTupleQuery(
  config: KetoTupleConfig,
  userId: string,
  relation: PlatformRelation,
) {
  return new URLSearchParams({
    namespace: config.namespace,
    object: config.object,
    relation,
    subject_id: `user:${userId}`,
  });
}

export type RoleToggleInput = {
  admin?: boolean;
  moderator?: boolean;
  expert?: boolean;
};

const MANAGED_RELATIONS: PlatformRelation[] = ['admin', 'moderator', 'expert'];

export function diffPlatformRoles(
  current: PlatformRole[],
  desired: RoleToggleInput,
): { grants: PlatformRelation[]; revokes: PlatformRelation[] } {
  const grants: PlatformRelation[] = [];
  const revokes: PlatformRelation[] = [];

  for (const relation of MANAGED_RELATIONS) {
    const wants = desired[relation] === true;
    const has = current.includes(relation);
    if (wants && !has) grants.push(relation);
    if (!wants && has) revokes.push(relation);
  }

  return { grants, revokes };
}

export function assertCanRevokeAdmin(actorId: string, targetUserId: string, revokes: PlatformRelation[]) {
  if (actorId === targetUserId && revokes.includes('admin')) {
    throw new Error('Cannot revoke your own admin role');
  }
}
