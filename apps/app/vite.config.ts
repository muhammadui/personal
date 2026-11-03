import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      injectManifest: { globPatterns: ["**/*.{js,css,html,svg,png,woff2,wasm}"] },
      devOptions: { enabled: true, type: "module" },
      manifest: {
        id: "/",
        name: "Personal",
        short_name: "Personal",
        description: "Notes and tasks that work offline.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F7F8FC",
        theme_color: "#F7F8FC",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: false, ws: true },
    },
  },
  build: { target: "es2022", sourcemap: true },
})
