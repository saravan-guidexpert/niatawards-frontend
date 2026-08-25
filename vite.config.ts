import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
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
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-motion":   ["framer-motion"],
          "vendor-query":    ["@tanstack/react-query"],
          "vendor-ui":       ["lucide-react"],
        },
      },
    },
    // Target modern browsers for smaller output
    target: "es2020",
    // Report chunk sizes
    chunkSizeWarningLimit: 400,
  },
}));
