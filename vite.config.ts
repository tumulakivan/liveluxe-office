import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_PORT = Number(process.env.PORT) || 4100;

export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./web/src", import.meta.url)) },
  },
  server: {
    // Not Vite's default 5173, so this can run alongside other Vite apps (adVantage uses 5173).
    port: 5180,
    strictPort: true,
    // The API is a separate process in development; proxying keeps everything
    // same-origin, so the session cookie behaves exactly as it does in production.
    proxy: { "/api": `http://localhost:${API_PORT}` },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
