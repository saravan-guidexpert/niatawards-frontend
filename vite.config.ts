import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        timeout: 360000,
        proxyTimeout: 360000,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    // Enable Brotli/gzip — Vercel handles compression at CDN
    // Manual chunk splitting for better caching
    rollupOptions: {
      output: {
        // Function form so shared deps (react/jsx-runtime) stay with React,
        // not inside vendor-motion. Array-form was causing the homepage to
        // statically import vendor-motion just for jsx().
        manualChunks(id) {
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          // Do not force all lucide-react into one chunk: that made `/` download
          // every icon used by admin, OTP, and below-fold sections.
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler") ||
            id.includes("/node_modules/react/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
    // Target modern browsers for smaller output
    target: "es2020",
    // Report chunk sizes
    chunkSizeWarningLimit: 400,
  },
}));
