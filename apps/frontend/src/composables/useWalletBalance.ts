import { getBalance } from '@/services/wallet';
import { useSessionStore } from '@/stores/session';

/** Fetch wallet balance from BFF and update header session state. */
export async function refreshSessionBalance(): Promise<void> {
  const session = useSessionStore();
  if (!session.isMember) return;
  const identity = session.actAsUserId ?? session.userId;
  if (!identity) return;
  session.setBalance(0, 'RUB');

  try {
    const wallet = await getBalance();
    const current = useSessionStore();
    if ((current.actAsUserId ?? current.userId) === identity) {
      current.setBalance(wallet.balance, wallet.currency);
    }
  } catch {
    /* Identity-scoped balance remains cleared on transient errors. */
  }
}
