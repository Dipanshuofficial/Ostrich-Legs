import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward all requests starting with /api to the backend
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Also proxy the socket.io connection
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
});
