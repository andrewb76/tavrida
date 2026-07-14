import type { ScalarVariableRegistration } from '../scalar-config/bff-scalar-variables.registry';

/** Forum-owned scalar keys — [PLATFORM-REGISTRY.md](../../../../docs/05-microservices/PLATFORM-REGISTRY.md). */
export const FORUM_SCALAR_REGISTRY: ScalarVariableRegistration[] = [
  {
    key: 'forum.edit.windowMinutes',
    type: 'number',
    default: 10,
    service: 'forum',
    description:
      'Окно редактирования своего поста/комментария (мин). 0 — нельзя, -1 — всегда.',
  },
  {
    key: 'forum.vote.changeWindowMinutes',
    type: 'number',
    default: 3,
    service: 'forum',
    description:
      'Окно смены +/- голоса (мин) с момента первого голоса. 0 — нельзя менять, -1 — всегда.',
  },
  {
    key: 'forum.vote.karmaPlusWeight',
    type: 'number',
    default: 0.2,
    service: 'forum',
    description: 'Δкармы автору за голос + (default 0.2).',
  },
  {
    key: 'forum.vote.karmaMinusWeight',
    type: 'number',
    default: 0.2,
    service: 'forum',
    description: 'Δкармы автору за голос − (вычитается, default 0.2).',
  },
];
