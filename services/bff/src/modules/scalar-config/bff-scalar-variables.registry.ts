export type ScalarVariableRegistration = {
  key: string;
  type: string;
  default: unknown;
  service: string;
  description: string;
};

/** BFF-owned club.* keys — [PLATFORM-REGISTRY.md](../../../docs/05-microservices/PLATFORM-REGISTRY.md). */
export const BFF_CLUB_SCALAR_REGISTRY: ScalarVariableRegistration[] = [
  {
    key: 'club.registration.inviteOnly',
    type: 'boolean',
    default: true,
    description: 'Закрытая регистрация (только инвайт)',
  },
  {
    key: 'club.invite.validityDays',
    type: 'number',
    default: 14,
    description: 'Срок действия invite-кода (дни)',
  },
  {
    key: 'club.invite.codeType',
    type: 'enum',
    default: 'SINGLE_USE',
    description: 'SINGLE_USE | MULTI_USE',
  },
  {
    key: 'club.landing.publicSections',
    type: 'string[]',
    default: ['about', 'rules', 'request'],
    description: 'Блоки публичного лендинга',
  },
].map((param) => ({ ...param, service: 'bff' }));
