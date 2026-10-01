import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

// Build output goes straight into the server's wwwroot so the single exe serves it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: path.resolve(__dirname, "../Server/wwwroot"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      // Geliştirmede sunucu düz HTTP 8080'de; TLS üretimde MSI ile kurulur (8443).
      "/api": { target: "http://localhost:8080", changeOrigin: false },
      "/hubs": { target: "http://localhost:8080", ws: true, changeOrigin: false },
    },
  },
})
