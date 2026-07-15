/**
 * Offline Lucide subset for @iconify/vue.
 * Per-icon imports from `@iconify-icons/lucide` keep the SPA bundle tree-shakeable.
 */
import { addIcon } from '@iconify/vue';
import bell from '@iconify-icons/lucide/bell';
import check from '@iconify-icons/lucide/check';
import chevronLeft from '@iconify-icons/lucide/chevron-left';
import chevronRight from '@iconify-icons/lucide/chevron-right';
import gavel from '@iconify-icons/lucide/gavel';
import home from '@iconify-icons/lucide/home';
import logOut from '@iconify-icons/lucide/log-out';
import menu from '@iconify-icons/lucide/menu';
import messageCircle from '@iconify-icons/lucide/message-circle';
import messagesSquare from '@iconify-icons/lucide/messages-square';
import moon from '@iconify-icons/lucide/moon';
import packageIcon from '@iconify-icons/lucide/package';
import pencil from '@iconify-icons/lucide/pencil';
import plus from '@iconify-icons/lucide/plus';
import search from '@iconify-icons/lucide/search';
import settings from '@iconify-icons/lucide/settings';
import shield from '@iconify-icons/lucide/shield';
import split from '@iconify-icons/lucide/split';
import store from '@iconify-icons/lucide/store';
import sun from '@iconify-icons/lucide/sun';
import tag from '@iconify-icons/lucide/tag';
import user from '@iconify-icons/lucide/user';
import wallet from '@iconify-icons/lucide/wallet';
import x from '@iconify-icons/lucide/x';

let registered = false;

const SUBSET: Record<string, typeof home> = {
  'lucide:home': home,
  'lucide:gavel': gavel,
  'lucide:messages-square': messagesSquare,
  'lucide:user': user,
  'lucide:shield': shield,
  'lucide:bell': bell,
  'lucide:moon': moon,
  'lucide:sun': sun,
  'lucide:log-out': logOut,
  'lucide:search': search,
  'lucide:wallet': wallet,
  'lucide:store': store,
  'lucide:package': packageIcon,
  'lucide:plus': plus,
  'lucide:x': x,
  'lucide:check': check,
  'lucide:chevron-right': chevronRight,
  'lucide:chevron-left': chevronLeft,
  'lucide:settings': settings,
  'lucide:menu': menu,
  'lucide:message-circle': messageCircle,
  'lucide:pencil': pencil,
  'lucide:split': split,
  'lucide:tag': tag,
};

export function registerLucideIcons(): void {
  if (registered) return;
  for (const [id, data] of Object.entries(SUBSET)) {
    addIcon(id, data);
  }
  registered = true;
}

registerLucideIcons();
