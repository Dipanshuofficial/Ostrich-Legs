type MessageHandler = (data: any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private currentToken: string | null = null;
  private currentPersistentId: string | null = null;
  private messageHandlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  get(persistentId: string, token: string | null = null): WebSocketManager {
    const t = token || "";

    // Return existing connection if still valid
    if (
      this.ws?.readyState === WebSocket.OPEN &&
      this.currentToken === t &&
      this.currentPersistentId === persistentId
    ) {
      return this;
    }

    // Close existing connection
    this.disconnect();

    this.currentToken = t;
    this.currentPersistentId = persistentId;
    this.connect();

    return this;
  }

  // Find the connect() method and update the wsUrl construction
  private connect(): void {
    if (this.isConnecting || !this.currentPersistentId) return;

    this.isConnecting = true;

    // Render uses standard https/wss. Use an environment variable for the base URL.
    const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

    // Convert http/https to ws/wss
    const wsBase = baseUrl.replace(/^http/, "ws");

    // Render usually doesn't need the Vite proxy path (/ws),
    // check your server's listening route (usually just / or /socket.io)
    const wsUrl = `${wsBase}/ws?persistentId=${this.currentPersistentId}&token=${this.currentToken || ""}`;

    console.log(`[WebSocket] Connecting to: ${wsUrl}`);
    // ... rest of the method
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WebSocket] Connected");
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit("connect", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error("[WebSocket] Message parse error:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        this.isConnecting = false;
        this.emit("disconnect", {});
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        this.isConnecting = false;
      };
    } catch (err) {
      console.error("[WebSocket] Connection error:", err);
      this.isConnecting = false;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WebSocket] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: { event: string; data: any }): void {
    const handlers = this.messageHandlers.get(message.event);
    if (handlers) {
      handlers.forEach((handler) => handler(message.data));
    }

    // Also emit to generic "message" handlers
    const genericHandlers = this.messageHandlers.get("message");
    if (genericHandlers) {
      genericHandlers.forEach((handler) => handler(message));
    }
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.warn("[WebSocket] Cannot emit, connection not open");
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentToken = null;
    this.currentPersistentId = null;
    this.reconnectAttempts = 0;
    this.messageHandlers.clear();
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();
