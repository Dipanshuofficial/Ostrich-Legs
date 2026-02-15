import { io, Socket } from "socket.io-client";

class SocketManager {
  private socket: Socket | null = null;
  private currentToken: string | null = null;

  get(persistentId: string, token: string | null = null) {
    const t = token || "";
    // Ensure we don't recreate the socket if identity and token haven't changed
    if (this.socket?.connected && this.currentToken === t) {
      return this.socket;
    }

    // Token mismatch or disconnected: Kill and rebuild
    this.socket?.disconnect();
    this.currentToken = t;

    // Replace the hardcoded URL logic
    const url =
      import.meta.env.VITE_SERVER_URL ||
      `http://${window.location.hostname}:3000`;

    this.socket = io(url, {
      query: { persistentId, token: t },
      auth: { token: t },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 800,
      path: "/socket.io/",
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentToken = null;
  }
}

export const socketManager = new SocketManager();
