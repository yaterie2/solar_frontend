import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  base: "/subdirectory/", // Adjust if necessary
  resolve: {
    alias: {
      "@images": path.resolve(__dirname, "images"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
  },
});
