#!/usr/bin/env node
/**
 * Serve website/publish-test (pages + downloads + updates) on the LAN.
 * Default port 4173 to match UPDATE_BASE_URL_TEST / the test updater endpoint.
 */
import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, extname, join, normalize, resolve, sep } from "node:path";
import { networkInterfaces } from "node:os";
import { spawnSync } from "node:child_process";
import { loadSiteEnv, publishTestRoot, websiteRoot } from "./site-env.mjs";

const { UPDATE_BASE_URL_TEST } = loadSiteEnv({ apply: true });
const syncScript = resolve(websiteRoot, "scripts/site-sync-web.mjs");

const port = Number(process.env.SITE_SERVE_PORT || 4173);
const host = process.env.SITE_SERVE_HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".dmg": "application/octet-stream",
  ".sig": "text/plain; charset=utf-8",
  ".gz": "application/gzip",
  ".exe": "application/octet-stream",
  ".msi": "application/octet-stream",
  ".AppImage": "application/octet-stream",
};

function ensurePublishRoot() {
  mkdirSync(join(publishTestRoot, "downloads"), { recursive: true });
  mkdirSync(join(publishTestRoot, "updates"), { recursive: true });
  if (!existsSync(join(publishTestRoot, "index.html"))) {
    const sync = spawnSync("node", [syncScript, "--test"], {
      cwd: websiteRoot,
      stdio: "inherit",
    });
    if (sync.status !== 0) process.exit(sync.status ?? 1);
  }
}

function lanUrls() {
  /** @type {string[]} */
  const urls = [];
  const nets = networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const net of list) {
      if (net.internal || net.family !== "IPv4") continue;
      urls.push(`http://${net.address}:${port}`);
    }
  }
  return urls;
}

function safeJoin(rootDir, reqPath) {
  const decoded = decodeURIComponent(reqPath.split("?")[0] || "/");
  const cleaned = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = resolve(rootDir, `.${cleaned}`);
  if (!full.startsWith(rootDir + sep) && full !== rootDir) return null;
  return full;
}

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

/** Simple HTML listing when a directory has no index.html (e.g. /downloads/). */
function directoryListingHtml(dirPath, urlPath) {
  const base = urlPath.endsWith("/") ? urlPath : `${urlPath}/`;
  const names = readdirSync(dirPath).sort((a, b) => a.localeCompare(b));
  const items = names
    .map((name) => {
      const full = join(dirPath, name);
      const isDir = statSync(full).isDirectory();
      const href = `${base}${encodeURIComponent(name)}${isDir ? "/" : ""}`;
      const label = `${name}${isDir ? "/" : ""}`;
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join("\n");
  const parts = base.replace(/\/+$/, "").split("/").filter(Boolean);
  parts.pop();
  const parentHref = parts.length ? `/${parts.join("/")}/` : "/";
  const parent = base === "/" ? "" : `<p><a href="${parentHref}">..</a></p>`;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Index of ${base}</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem;line-height:1.5} li{margin:.25rem 0}</style>
</head>
<body>
<h1>Index of ${base}</h1>
${parent}
<ul>
${items || "<li>(empty)</li>"}
</ul>
</body>
</html>`;
}

ensurePublishRoot();

const server = createServer((req, res) => {
  const url = req.url || "/";
  const reqPath = url.split("?")[0] || "/";
  let filePath = safeJoin(publishTestRoot, reqPath === "/" ? "/index.html" : reqPath);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    const indexHtml = join(filePath, "index.html");
    if (existsSync(indexHtml)) {
      filePath = indexHtml;
    } else {
      send(
        res,
        200,
        directoryListingHtml(filePath, reqPath.endsWith("/") ? reqPath : `${reqPath}/`),
        MIME[".html"],
      );
      return;
    }
  }
  if (!existsSync(filePath)) {
    const fallback = join(publishTestRoot, "index.html");
    // Never SPA-fallback known locale prefixes to English index.html.
    const isLocalePath =
      reqPath === "/zh" ||
      reqPath.startsWith("/zh/") ||
      reqPath === "/en" ||
      reqPath.startsWith("/en/");
    if (
      existsSync(fallback) &&
      !isLocalePath &&
      !reqPath.startsWith("/downloads") &&
      !reqPath.startsWith("/updates")
    ) {
      send(res, 200, readFileSync(fallback), MIME[".html"]);
      return;
    }
    send(res, 404, "Not found");
    return;
  }
  const type = MIME[extname(filePath)] || "application/octet-stream";
  /** @type {Record<string, string>} */
  const headers = {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  };
  if (type === "application/octet-stream" || type === "application/gzip") {
    headers["Content-Disposition"] =
      `attachment; filename="${basename(filePath)}"`;
  }
  res.writeHead(200, headers);
  res.end(readFileSync(filePath));
});

server.listen(port, host, () => {
  console.log(`Serving ${publishTestRoot}`);
  console.log(`  local:  http://127.0.0.1:${port}`);
  for (const u of lanUrls()) console.log(`  lan:    ${u}`);
  console.log(`website/.env UPDATE_BASE_URL_TEST=${UPDATE_BASE_URL_TEST}`);
  console.log(`updater: ${UPDATE_BASE_URL_TEST}/updates/latest.json`);
});
