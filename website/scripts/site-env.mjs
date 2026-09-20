import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `website/` package root (parent of `scripts/`). */
const websiteRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
/** Monorepo / app root (parent of `website/`). */
const repoRoot = resolve(websiteRoot, "..");
/** Sole LAN deploy document root. */
const publishRoot = resolve(websiteRoot, "publish");

/**
 * Parse a simple KEY=VALUE env file (no export, # comments).
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
export function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Load website/.env (gitignored; copy from env.example) + process.env.
 * Does not mutate process.env unless apply=true.
 * @param {{ apply?: boolean }} [opts]
 */
export function loadSiteEnv(opts = {}) {
  const fileVars = parseEnvFile(resolve(websiteRoot, ".env"));
  /** @type {Record<string, string>} */
  const merged = {
    UPDATE_BASE_URL: "http://127.0.0.1:4173",
    TAURI_SIGNING_PRIVATE_KEY_PATH: resolve(
      websiteRoot,
      "keys/updater.test.key",
    ),
    ...fileVars,
  };
  for (const [k, v] of Object.entries(process.env)) {
    if (v != null && v !== "") merged[k] = v;
  }
  if (opts.apply) {
    for (const [k, v] of Object.entries(merged)) {
      if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
    }
  }
  return {
    root: repoRoot,
    repoRoot,
    websiteRoot,
    publishRoot,
    ...merged,
    UPDATE_BASE_URL: merged.UPDATE_BASE_URL.replace(/\/$/, ""),
  };
}

export { websiteRoot, repoRoot, publishRoot };
/** @deprecated Use repoRoot — kept for older call sites. */
export const root = repoRoot;
