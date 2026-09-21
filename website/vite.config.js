import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sveltekit()],
  // Process workspace Svelte sources (HudView package) instead of prebundling.
  optimizeDeps: {
    exclude: ["z-key-cast-hud-view"],
  },
  ssr: {
    noExternal: ["z-key-cast-hud-view"],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
});
