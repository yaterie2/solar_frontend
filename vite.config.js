import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@images": path.resolve(__dirname, "images"),
    },
  },
  server: {
    port: 3001,
  },
  build: {
    outDir: "dist",
  },
});
