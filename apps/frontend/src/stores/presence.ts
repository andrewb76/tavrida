import { bffFetch } from '@/services/apiAuth';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type PresenceStatus = 'online' | 'away' | 'offline';

export type PresenceInfo = {
  status: PresenceStatus;
  lastSeen: string | null;
};

const HEARTBEAT_INTERVAL_MS = 30_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat(visibility: 'visible' | 'hidden' = 'visible'): Promise<void> {
  try {
    await bffFetch('/presence/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ visibility }),
    });
  } catch {
    /* best-effort */
  }
}

function onVisibilityChange(): void {
  if (document.hidden) {
    void sendHeartbeat('hidden');
  } else {
    void sendHeartbeat('visible');
  }
}

export const usePresenceStore = defineStore('presence', () => {
  const cache = ref<Map<string, PresenceInfo>>(new Map());

  function setFromBatch(userIds: string[], statuses: PresenceStatus[]): void {
    userIds.forEach((id, i) => {
      cache.value.set(id, {
        status: statuses[i] ?? 'offline',
        lastSeen: null,
      });
    });
  }

  function setStatus(userId: string, status: PresenceStatus): void {
    cache.value.set(userId, { status, lastSeen: null });
  }

  function getStatus(userId: string): PresenceStatus {
    return cache.value.get(userId)?.status ?? 'offline';
  }

  function startHeartbeat(): void {
    if (heartbeatTimer) return;
    void sendHeartbeat();
    heartbeatTimer = setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  return { cache, setFromBatch, setStatus, getStatus, startHeartbeat, stopHeartbeat };
});
