import { useSessionStore } from '@/stores/session';
import { onBeforeUnmount, ref, shallowRef } from 'vue';

export type WsServerEvent = {
  type: 'event';
  channel: string;
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type WsHandler = (ev: WsServerEvent) => void;

type ChannelEntry = {
  handlers: Set<WsHandler>;
  subscribed: boolean;
};

const DEFAULT_RECONNECT_MS = 1500;

function wsBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const api = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  if (api.startsWith('http')) {
    const u = new URL(api);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws/v1';
    u.search = '';
    return u.toString().replace(/\/$/, '');
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/v1`;
}

/** Singleton WS client — one connection, multi-channel subscribe. */
class WsClient {
  private socket: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private readonly channels = new Map<string, ChannelEntry>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private reqSeq = 0;

  readonly status = ref<'idle' | 'connecting' | 'open' | 'closed'>('idle');

  async ensureConnected(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      this.intentionalClose = false;
      this.status.value = 'connecting';
      const session = useSessionStore();
      const token = await session.getAccessToken();
      if (!token) throw new Error('Нет токена для WebSocket');

      const url = `${wsBaseUrl()}?token=${encodeURIComponent(token)}`;
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(url);
        this.socket = ws;
        const onOpen = () => {
          cleanup();
          this.status.value = 'open';
          this.resubscribeAll();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('WebSocket connection failed'));
        };
        const cleanup = () => {
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
        };
        ws.addEventListener('open', onOpen);
        ws.addEventListener('error', onError);
        ws.addEventListener('message', (ev) => this.onRawMessage(String(ev.data)));
        ws.addEventListener('close', () => {
          this.status.value = 'closed';
          this.socket = null;
          for (const entry of this.channels.values()) {
            entry.subscribed = false;
          }
          if (!this.intentionalClose) this.scheduleReconnect();
        });
      });
    })().finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  async subscribe(channel: string, handler: WsHandler): Promise<() => void> {
    let entry = this.channels.get(channel);
    if (!entry) {
      entry = { handlers: new Set(), subscribed: false };
      this.channels.set(channel, entry);
    }
    entry.handlers.add(handler);
    await this.ensureConnected();
    this.sendSubscribe(channel);

    return () => {
      entry!.handlers.delete(handler);
      if (entry!.handlers.size === 0) {
        this.sendUnsubscribe(channel);
        this.channels.delete(channel);
      }
    };
  }

  sendTyping(channel: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: 'typing',
        channel,
        requestId: String(++this.reqSeq),
      }),
    );
  }

  private sendSubscribe(channel: string): void {
    const entry = this.channels.get(channel);
    if (!entry || entry.subscribed) return;
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: 'subscribe',
        channel,
        requestId: String(++this.reqSeq),
      }),
    );
    entry.subscribed = true;
  }

  private sendUnsubscribe(channel: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: 'unsubscribe',
        channel,
        requestId: String(++this.reqSeq),
      }),
    );
  }

  private resubscribeAll(): void {
    for (const [channel, entry] of this.channels) {
      if (entry.handlers.size) {
        entry.subscribed = false;
        this.sendSubscribe(channel);
      }
    }
  }

  private onRawMessage(raw: string): void {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (data.type !== 'event') return;
    const ev = data as unknown as WsServerEvent;
    const entry = this.channels.get(ev.channel);
    if (!entry) return;
    for (const handler of entry.handlers) {
      try {
        handler(ev);
      } catch {
        /* ignore handler errors */
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.channels.size) return;
      void this.ensureConnected().catch(() => this.scheduleReconnect());
    }, DEFAULT_RECONNECT_MS);
  }
}

const shared = shallowRef<WsClient | null>(null);

function client(): WsClient {
  if (!shared.value) shared.value = new WsClient();
  return shared.value;
}

/**
 * Subscribe to a BFF WS channel for the lifetime of the calling component.
 * Example: `useWsChannel('chat:' + chatId, (ev) => …)`
 */
export function useWsChannel(channel: string, handler: WsHandler) {
  const unsub = ref<(() => void) | null>(null);

  void client()
    .subscribe(channel, handler)
    .then((fn) => {
      unsub.value = fn;
    })
    .catch(() => {
      /* room still works over REST */
    });

  onBeforeUnmount(() => {
    unsub.value?.();
    unsub.value = null;
  });

  return {
    status: client().status,
    sendTyping: () => client().sendTyping(channel),
  };
}

export function useWs() {
  return {
    status: client().status,
    subscribe: (channel: string, handler: WsHandler) => client().subscribe(channel, handler),
    sendTyping: (channel: string) => client().sendTyping(channel),
  };
}
