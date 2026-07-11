import { getBalance } from '@/services/wallet';
import { useSessionStore } from '@/stores/session';

/** Fetch wallet balance from BFF and update header session state. */
export async function refreshSessionBalance(): Promise<void> {
  const session = useSessionStore();
  if (!session.isMember) return;

  try {
    const wallet = await getBalance();
    session.setBalance(wallet.balance, wallet.currency);
  } catch {
    /* keep previous balance on transient errors */
  }
}
