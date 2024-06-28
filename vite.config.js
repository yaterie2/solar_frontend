// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  // other config options
  build: {
    rollupOptions: {
      external: ["axios"], // Add other dependencies here if needed
    },
  },
});
