import { resolveNadoEndpoints, resolveNadoEnv, type NadoEndpoints } from "./config";
import type { NadoEnv, NadoSubscriptionChannel, NadoSubscriptionMessage } from "./types";

export type NadoSubscriptionsClientOptions = {
  env?: NadoEnv;
  endpoints?: Partial<NadoEndpoints>;
  pingIntervalMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  websocketFactory?: (url: string) => WebSocket;
};

export class NadoSubscriptionsClient {
  private readonly wsUrl: string;
  private readonly pingIntervalMs: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly websocketFactory: (url: string) => WebSocket;

  private websocket: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private disposed = false;

  private readonly subscriptions = new Map<string, NadoSubscriptionChannel>();

  constructor(options: NadoSubscriptionsClientOptions = {}) {
    const env = resolveNadoEnv(options.env);
    const endpoints = resolveNadoEndpoints(env, options.endpoints);
    this.wsUrl = endpoints.subscriptionsWs;
    this.pingIntervalMs = options.pingIntervalMs ?? 30_000;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;
    this.websocketFactory = options.websocketFactory ?? ((url) => new WebSocket(url));
  }

  connect(onMessage: (message: NadoSubscriptionMessage) => void): void {
    this.disposed = false;
    const ws = this.websocketFactory(this.wsUrl);
    this.websocket = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startPing();
      this.resubscribeAll();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(String(event.data)) as NadoSubscriptionMessage;
      onMessage(data);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      this.stopPing();
      this.websocket = null;
      if (!this.disposed) {
        this.scheduleReconnect(onMessage);
      }
    };
  }

  subscribe(channel: NadoSubscriptionChannel): void {
    this.subscriptions.set(channel.channel, channel);
    this.send({ op: "subscribe", ...channel });
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ op: "unsubscribe", channel });
  }

  disconnect(): void {
    this.disposed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ op: "ping", ts: Date.now() });
    }, this.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(onMessage: (message: NadoSubscriptionMessage) => void): void {
    const delay = Math.min(
      this.reconnectMaxDelayMs,
      this.reconnectBaseDelayMs * 2 ** this.reconnectAttempts
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(onMessage);
    }, delay);
  }

  private resubscribeAll(): void {
    for (const channel of this.subscriptions.values()) {
      this.send({ op: "subscribe", ...channel });
    }
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.websocket.send(JSON.stringify(payload));
  }
}
