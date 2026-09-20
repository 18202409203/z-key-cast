#!/usr/bin/env node
/**
 * Internal / debug Tauri build: enables updater feature + merges internal (+ local) config.
 * Overrides app version from website/.site-test-version when --bump-test-version is passed
 * (used by site:publish-test). Does not edit package.json / Cargo.toml / tauri.conf.json on disk.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadSiteEnv } from "../website/scripts/site-env.mjs";

const args = new Set(process.argv.slice(2));
const bumpTest = args.has("--bump-test-version");
const dryRun =
  args.has("--dry-run") ||
  process.env.RELEASE_KIT_DRY_RUN === "1" ||
  process.env.RELEASE_KIT_DRY_RUN === "true";

const env = loadSiteEnv({ apply: true });
const { repoRoot, websiteRoot, UPDATE_BASE_URL } = env;
const testVersionFile = resolve(websiteRoot, ".site-test-version");
const localConf = resolve(repoRoot, "src-tauri/tauri.local.conf.json");
const internalConf = resolve(repoRoot, "src-tauri/tauri.internal.conf.json");
const generatedConf = resolve(
  repoRoot,
  "src-tauri/tauri.generated.internal.conf.json",
);
const defaultKeyPath = resolve(websiteRoot, "keys/updater.test.key");

function repoVersion() {
  return String(
    JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")).version,
  );
}

function resolveTestVersion() {
  const base = repoVersion();
  let current = base;
  if (existsSync(testVersionFile)) {
    current = readFileSync(testVersionFile, "utf8").trim() || base;
  }
  if (!bumpTest) return current;

  const m = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  let next;
  if (!m) next = `${base}`;
  else next = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
  if (!dryRun) writeFileSync(testVersionFile, `${next}\n`, "utf8");
  return next;
}

function writeGeneratedConf(version) {
  const endpoint = `${UPDATE_BASE_URL}/updates/latest.json`;
  /** @type {Record<string, unknown>} */
  const conf = {
    version,
    plugins: {
      updater: {
        endpoints: [endpoint],
        dangerousInsecureTransportProtocol: true,
      },
    },
  };
  if (existsSync(localConf)) {
    try {
      const local = JSON.parse(readFileSync(localConf, "utf8"));
      if (local?.plugins?.updater?.endpoints) {
        conf.plugins = {
          updater: {
            ...conf.plugins.updater,
            ...local.plugins.updater,
          },
        };
      }
      if (local.version) conf.version = local.version;
    } catch (err) {
      console.warn(`warn: could not parse ${localConf}:`, err);
    }
  }
  if (dryRun) {
    console.log(
      "[dry-run] generated internal merge config:",
      JSON.stringify(conf, null, 2),
    );
    return generatedConf;
  }
  mkdirSync(resolve(repoRoot, "src-tauri"), { recursive: true });
  writeFileSync(generatedConf, `${JSON.stringify(conf, null, 2)}\n`, "utf8");
  return generatedConf;
}

function main() {
  const keyPath =
    process.env.TAURI_SIGNING_PRIVATE_KEY_PATH ||
    env.TAURI_SIGNING_PRIVATE_KEY_PATH ||
    defaultKeyPath;

  if (!existsSync(keyPath) && !process.env.TAURI_SIGNING_PRIVATE_KEY) {
    console.error(
      `Missing signing private key at ${keyPath}. Generate with:\n  pnpm tauri signer generate --ci -w website/keys/updater.test.key`,
    );
    process.exit(1);
  }

  const version = resolveTestVersion();
  const gen = writeGeneratedConf(version);

  process.env.TAURI_SIGNING_PRIVATE_KEY =
    process.env.TAURI_SIGNING_PRIVATE_KEY || keyPath;
  if (process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD == null) {
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "";
  }

  const tauriArgs = [
    "tauri",
    "build",
    "--config",
    internalConf,
    "--config",
    gen,
    "--",
    "--features",
    "internal-updater",
  ];

  console.log(
    `tauri:build:internal version=${version} endpoint=${UPDATE_BASE_URL}/updates/latest.json`,
  );
  console.log(`$ pnpm ${tauriArgs.join(" ")}`);
  if (dryRun) return;

  const res = spawnSync("pnpm", tauriArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(res.status ?? 1);
}

main();
