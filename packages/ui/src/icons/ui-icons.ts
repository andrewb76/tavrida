/** Semantic Lucide names used across Tavrida Lot UI. Prefer these over raw strings. */
export const uiIcons = {
  home: 'lucide:home',
  auctions: 'lucide:gavel',
  forum: 'lucide:messages-square',
  profile: 'lucide:user',
  admin: 'lucide:shield',
  notifications: 'lucide:bell',
  moon: 'lucide:moon',
  sun: 'lucide:sun',
  logout: 'lucide:log-out',
  search: 'lucide:search',
  wallet: 'lucide:wallet',
  store: 'lucide:store',
  package: 'lucide:package',
  plus: 'lucide:plus',
  close: 'lucide:x',
  check: 'lucide:check',
  chevronRight: 'lucide:chevron-right',
  chevronLeft: 'lucide:chevron-left',
  settings: 'lucide:settings',
  menu: 'lucide:menu',
} as const;

export type UiIconName = keyof typeof uiIcons | (string & {});

export function resolveUiIcon(name: UiIconName): string {
  if (typeof name === 'string' && name in uiIcons) {
    return uiIcons[name as keyof typeof uiIcons];
  }
  if (typeof name === 'string' && name.includes(':')) return name;
  return `lucide:${name}`;
}
