import { defineConfig } from "vite";

export default defineConfig({
  // Specify your entry points
  build: {
    outDir: "dist", // Output directory for production build
    assetsDir: "assets", // Directory for static assets
  },
  // Configure plugins, server, etc.
});
