export type SettingKeyRegistration = {
  key: string;
  type: string;
  default: unknown;
  service: string;
  description: string;
};

/** BFF-owned club.* keys — [PLATFORM-REGISTRY.md](../../../docs/05-microservices/PLATFORM-REGISTRY.md). */
export const BFF_CLUB_SETTINGS_REGISTRY: SettingKeyRegistration[] = [
  {
    key: 'club.registration.inviteOnly',
    type: 'boolean',
    default: true,
    service: 'bff',
    description: 'Закрытая регистрация (только инвайт)',
  },
  {
    key: 'club.invite.validityDays',
    type: 'number',
    default: 14,
    service: 'bff',
    description: 'Срок действия invite-кода (дни)',
  },
  {
    key: 'club.invite.codeType',
    type: 'enum',
    default: 'SINGLE_USE',
    service: 'bff',
    description: 'SINGLE_USE | MULTI_USE',
  },
  {
    key: 'club.landing.publicSections',
    type: 'string[]',
    default: ['about', 'rules', 'request'],
    service: 'bff',
    description: 'Блоки публичного лендинга',
  },
];
