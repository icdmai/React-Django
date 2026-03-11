// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function cspHeaderPlugin() {
  return {
    name: "custom-csp-header",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader(
          "Content-Security-Policy",
          "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000;",
        );
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), cspHeaderPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});


