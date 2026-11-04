// src/lib/ws-client.ts — Realtime WebSocket Client for ASTRAONYX

export type WsMessageListener = (type: string, data: any) => void;

class AstraonyxSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<WsMessageListener> = new Set();
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type) {
            this.notifyListeners(parsed.type, parsed.data);
          }
        } catch (_) {}
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        if (this.socket) this.socket.close();
      };
    } catch (_) {
      this.scheduleReconnect();
    }
  }

  public subscribe(listener: WsMessageListener) {
    this.connect();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public on(type: string, handler: (data: any) => void) {
    this.connect();
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);
  }

  public off(type: string, handler: (data: any) => void) {
    if (this.eventHandlers.has(type)) {
      this.eventHandlers.get(type)!.delete(handler);
    }
  }

  private notifyListeners(type: string, data: any) {
    // Notify generic subscribers
    this.listeners.forEach((fn) => {
      try {
        fn(type, data);
      } catch (_) {}
    });

    // Notify specific type handlers
    if (this.eventHandlers.has(type)) {
      this.eventHandlers.get(type)!.forEach((fn) => {
        try {
          fn(data);
        } catch (_) {}
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public send(type: string, payload: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data: payload }));
    }
  }
}

export const astraSocket = new AstraonyxSocketClient();
