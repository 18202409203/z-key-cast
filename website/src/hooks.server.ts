import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const lang =
    path === "/zh" || path === "/zh/" || path.startsWith("/zh/") ? "zh" : "en";
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replaceAll("%lang%", lang),
  });
};
