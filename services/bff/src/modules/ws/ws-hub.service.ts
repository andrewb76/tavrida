import {
  Injectable,
  Logger,
  ForbiddenException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatClient } from '../chats/chat.client';
import { ScalarConfigClient } from '../scalar-config/scalar-config.client';

type ClientMsg =
  | { type: 'subscribe'; channel: string; requestId?: string }
  | { type: 'unsubscribe'; channel: string; requestId?: string }
  | { type: 'typing'; channel: string; requestId?: string };

type SocketState = {
  userId: string;
  channels: Set<string>;
};

@Injectable()
export class WsHubService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WsHubService.name);
  private wss: WebSocketServer | null = null;
  private readonly sockets = new Map<WebSocket, SocketState>();
  private readonly channelMembers = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly jwt: JwtAuthGuard,
    private readonly chat: ChatClient,
    private readonly scalarConfig: ScalarConfigClient,
  ) {}

  onApplicationBootstrap(): void {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer() as Server;
    this.wss = new WebSocketServer({ server, path: '/ws/v1' });
    this.wss.on('connection', (socket, req) => {
      void this.onConnection(socket, req);
    });
    this.logger.log('WebSocket hub listening on /ws/v1');
  }

  onModuleDestroy(): void {
    for (const socket of this.sockets.keys()) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    }
    this.sockets.clear();
    this.channelMembers.clear();
    this.wss?.close();
    this.wss = null;
  }

  publish(channel: string, event: string, payload: unknown): void {
    const sockets = this.channelMembers.get(channel);
    if (!sockets?.size) return;
    const frame = JSON.stringify({
      type: 'event',
      channel,
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(frame);
      }
    }
  }

  private async onConnection(socket: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      const url = new URL(req.url ?? '/ws/v1', 'http://localhost');
      const token = url.searchParams.get('token')?.trim();
      if (!token) {
        socket.close(4401, 'missing token');
        return;
      }
      const user = await this.jwt.verifyAccessToken(token);
      await this.jwt.assertNotHardLocked(user.sub);
      this.sockets.set(socket, { userId: user.sub, channels: new Set() });
      socket.on('message', (raw) => {
        void this.onMessage(socket, raw.toString());
      });
      socket.on('close', () => this.cleanup(socket));
      socket.on('error', () => this.cleanup(socket));
      this.send(socket, { type: 'ready', userId: user.sub });
    } catch (err) {
      this.logger.debug(`WS auth failed: ${String(err)}`);
      const hardLocked =
        err instanceof ForbiddenException &&
        typeof err.getResponse() === 'object' &&
        err.getResponse() != null &&
        (err.getResponse() as { type?: string }).type === 'hard_locked';
      socket.close(hardLocked ? 4403 : 4401, hardLocked ? 'hard_locked' : 'unauthorized');
    }
  }

  private async onMessage(socket: WebSocket, raw: string): Promise<void> {
    const state = this.sockets.get(socket);
    if (!state) return;

    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw) as ClientMsg;
    } catch {
      this.send(socket, { type: 'error', detail: 'invalid json' });
      return;
    }

    if (msg.type === 'subscribe') {
      await this.subscribe(socket, state, msg.channel, msg.requestId);
      return;
    }
    if (msg.type === 'unsubscribe') {
      this.unsubscribe(socket, state, msg.channel);
      this.send(socket, {
        type: 'ack',
        requestId: msg.requestId ?? null,
        ok: true,
        channel: msg.channel,
      });
      return;
    }
    if (msg.type === 'typing') {
      await this.handleTyping(socket, state, msg.channel, msg.requestId);
      return;
    }
    this.send(socket, { type: 'error', detail: 'unknown type', requestId: (msg as { requestId?: string }).requestId ?? null });
  }

  private async subscribe(
    socket: WebSocket,
    state: SocketState,
    channel: string,
    requestId?: string,
  ): Promise<void> {
    const chatId = parseChatChannel(channel);
    if (!chatId) {
      this.send(socket, {
        type: 'error',
        requestId: requestId ?? null,
        detail: 'unsupported channel',
      });
      return;
    }

    try {
      await this.chat.get(chatId, state.userId);
    } catch {
      this.send(socket, {
        type: 'error',
        requestId: requestId ?? null,
        detail: 'forbidden',
      });
      return;
    }

    state.channels.add(channel);
    let set = this.channelMembers.get(channel);
    if (!set) {
      set = new Set();
      this.channelMembers.set(channel, set);
    }
    set.add(socket);
    this.send(socket, {
      type: 'ack',
      requestId: requestId ?? null,
      ok: true,
      channel,
    });
  }

  private unsubscribe(socket: WebSocket, state: SocketState, channel: string): void {
    state.channels.delete(channel);
    const set = this.channelMembers.get(channel);
    if (!set) return;
    set.delete(socket);
    if (!set.size) this.channelMembers.delete(channel);
  }

  private async handleTyping(
    socket: WebSocket,
    state: SocketState,
    channel: string,
    requestId?: string,
  ): Promise<void> {
    if (!state.channels.has(channel)) {
      this.send(socket, {
        type: 'error',
        requestId: requestId ?? null,
        detail: 'not subscribed',
      });
      return;
    }
    const chatId = parseChatChannel(channel);
    if (!chatId) return;

    let ttlSec = 5;
    try {
      const settings = await this.scalarConfig.getChatSettings();
      const raw = settings['realtime.typingTtlSeconds'];
      if (typeof raw === 'number' && raw > 0) ttlSec = raw;
    } catch {
      /* default */
    }

    const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
    const sockets = this.channelMembers.get(channel);
    if (!sockets) return;
    const frame = JSON.stringify({
      type: 'event',
      channel,
      event: 'typing',
      payload: { userId: state.userId, expiresAt },
      timestamp: new Date().toISOString(),
    });
    for (const peer of sockets) {
      if (peer === socket) continue;
      if (peer.readyState === peer.OPEN) peer.send(frame);
    }
    this.send(socket, {
      type: 'ack',
      requestId: requestId ?? null,
      ok: true,
      channel,
    });
  }

  private cleanup(socket: WebSocket): void {
    const state = this.sockets.get(socket);
    if (!state) return;
    for (const channel of state.channels) {
      this.unsubscribe(socket, state, channel);
    }
    this.sockets.delete(socket);
  }

  private send(socket: WebSocket, payload: Record<string, unknown>): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }
}

function parseChatChannel(channel: string): string | null {
  const match = /^chat:([0-9a-f-]{36})$/i.exec(channel.trim());
  return match?.[1] ?? null;
}
