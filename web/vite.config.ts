import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".",
  base: "/",
  build: {
    outDir: "../server/web_dist",
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
      "/api": {
        target: "http://localhost:8080",
      },
      "/p": {
        target: "http://localhost:8080",
      },
    },
  },
});
