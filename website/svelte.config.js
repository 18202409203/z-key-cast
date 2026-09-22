import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      // No SPA shell — marketing routes are fully prerendered (`/` + `/zh/`).
      // Avoids missing `/zh/` falling back to the English index.
      fallback: undefined,
      precompress: false,
      strict: true,
    }),
    prerender: {
      // `/downloads/` and `/updates/*` are publish-root artifacts, not Kit routes.
      handleHttpError: ({ path, message }) => {
        if (path.startsWith("/downloads") || path.startsWith("/updates")) {
          return;
        }
        throw new Error(message);
      },
    },
  },
};

export default config;
