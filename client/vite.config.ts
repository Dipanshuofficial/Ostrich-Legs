import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    host: true,
    proxy: {
      // Proxy WebSocket connections to the Cloudflare Worker dev server
      "/ws": {
        target: "http://localhost:8787",
        changeOrigin: true,
        ws: true,
      },
      // Health check endpoint
      "/health": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      // Points @shared to the actual folder outside /client
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
});
