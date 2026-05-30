import { MOCK_API, WS_BASE } from "@/lib/constants";
import { mockApi } from "@/lib/mock";
import type { Snippet, WsEnvelope } from "@/types";

export type WsCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onSnippetPush?: (snippet: Snippet, sourceDeviceId?: string) => void;
  onSnippetDelete?: (snippetId: string) => void;
  onDeviceJoined?: (device: unknown) => void;
  onDeviceLeft?: (deviceId: string) => void;
  onPresence?: (devices: unknown[]) => void;
  onError?: (code: string, message: string) => void;
};

export class ClipDropWebSocket {
  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 1000;
  private closed = false;
  private mockUnsub: (() => void) | null = null;

  constructor(
    private token: string,
    private workspaceId: string,
    private deviceId: string,
    private callbacks: WsCallbacks,
  ) {}

  connect(): void {
    if (MOCK_API) {
      this.mockUnsub = mockApi.subscribe((snippet) => {
        this.callbacks.onSnippetPush?.(snippet, snippet.device_id);
      });
      this.callbacks.onOpen?.();
      return;
    }

    this.cleanupSocket();

    const url = `${WS_BASE}?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.backoff = 1000;
      this.callbacks.onOpen?.();
      this.startPing();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WsEnvelope;
        this.handleMessage(msg);
      } catch {
        /* ignore malformed */
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.callbacks.onClose?.();
      if (!this.closed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private handleMessage(msg: WsEnvelope): void {
    switch (msg.type) {
      case "connected":
        this.send("subscribe", {
          workspace_id: this.workspaceId,
          device_id: this.deviceId,
        });
        break;
      case "sync.push": {
        const payload = msg.payload as {
          snippet: Snippet;
          source_device_id?: string;
        };
        this.callbacks.onSnippetPush?.(
          payload.snippet,
          payload.source_device_id,
        );
        break;
      }
      case "sync.delete": {
        const payload = msg.payload as { snippet_id: string };
        this.callbacks.onSnippetDelete?.(payload.snippet_id);
        break;
      }
      case "device.joined": {
        const payload = msg.payload as { device?: unknown; device_id?: string };
        this.callbacks.onDeviceJoined?.(payload.device ?? payload);
        break;
      }
      case "device.left":
        this.callbacks.onDeviceLeft?.(
          (msg.payload as { device_id: string }).device_id,
        );
        break;
      case "subscribed":
        break;
      case "pong":
        break;
      case "presence.changed":
        this.callbacks.onPresence?.(
          (msg.payload as { devices: unknown[] }).devices,
        );
        break;
      case "error": {
        const payload = msg.payload as { code: string; message: string };
        this.callbacks.onError?.(payload.code, payload.message);
        break;
      }
      default:
        break;
    }
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (MOCK_API || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type,
        payload,
        ts: Date.now(),
      }),
    );
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send("ping"), 30000);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.backoff = Math.min(this.backoff * 2, 30000);
      this.connect();
    }, this.backoff);
  }

  private cleanupSocket(): void {
    if (!this.ws) return;
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onerror = null;
    this.ws.onclose = null;
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
    this.ws = null;
  }

  disconnect(): void {
    this.closed = true;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.mockUnsub?.();
    this.mockUnsub = null;
    this.cleanupSocket();
  }

  get isConnected(): boolean {
    if (MOCK_API) return true;
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
