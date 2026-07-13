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
];
