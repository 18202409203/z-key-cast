#!/usr/bin/env node
/**
 * Public Tauri build: updater on, production pubkey, endpoint from UPDATE_BASE_URL.
 * Signs updater artifacts with website/keys/updater.key.
 * Does not edit tauri.conf.json. Invoked by `pnpm tauri build`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadSiteEnv } from "../website/scripts/site-env.mjs";

const args = process.argv.slice(2);
const dryRun =
  args.includes("--dry-run") ||
  process.env.RELEASE_KIT_DRY_RUN === "1" ||
  process.env.RELEASE_KIT_DRY_RUN === "true";
const passThrough = args.filter((arg) => arg !== "--dry-run");

const env = loadSiteEnv({ apply: true });
const { repoRoot, websiteRoot, UPDATE_BASE_URL } = env;
const privateKeyPath = resolve(websiteRoot, "keys/updater.key");
const publicKeyPath = resolve(websiteRoot, "keys/updater.key.pub");
const generatedConf = resolve(repoRoot, "src-tauri/tauri.generated.conf.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function writeGeneratedConf(pubkey) {
  const endpoint = `${UPDATE_BASE_URL}/updates/latest.json`;
  const conf = {
    bundle: { createUpdaterArtifacts: true },
    app: {
      security: {
        capabilities: [
          "default",
          {
            identifier: "updater",
            description: "Updater + process permissions for public builds",
            windows: ["main"],
            permissions: ["updater:default", "process:default"],
          },
        ],
      },
    },
    plugins: {
      updater: {
        pubkey,
        endpoints: [endpoint],
      },
    },
  };
  if (dryRun) {
    console.log("[dry-run] generated public merge config:");
    console.log(JSON.stringify(conf, null, 2));
    return generatedConf;
  }
  mkdirSync(resolve(repoRoot, "src-tauri"), { recursive: true });
  writeFileSync(generatedConf, `${JSON.stringify(conf, null, 2)}\n`, "utf8");
  return generatedConf;
}

function main() {
  if (!UPDATE_BASE_URL.startsWith("https://")) {
    fail(
      "UPDATE_BASE_URL must be an https origin in website/.env before a public updater build.",
    );
  }
  if (!existsSync(privateKeyPath)) {
    fail(
      `Missing ${privateKeyPath}. Generate with:\n  pnpm tauri signer generate -w website/keys/updater.key`,
    );
  }
  if (!existsSync(publicKeyPath)) {
    fail(`Missing ${publicKeyPath}.`);
  }

  const pubkey = readFileSync(publicKeyPath, "utf8").trim();
  const gen = writeGeneratedConf(pubkey);
  const endpoint = `${UPDATE_BASE_URL}/updates/latest.json`;

  process.env.TAURI_SIGNING_PRIVATE_KEY = privateKeyPath;
  if (process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD == null) {
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "";
  }

  const splitAt = passThrough.indexOf("--");
  const beforeCargo = splitAt === -1 ? passThrough : passThrough.slice(0, splitAt);
  const cargoArgs = splitAt === -1 ? [] : passThrough.slice(splitAt + 1);
  const tauriArgs = [
    "tauri",
    "build",
    "--config",
    gen,
    ...beforeCargo,
    "--",
    "--features",
    "updater",
    ...cargoArgs,
  ];

  console.log(`tauri build endpoint=${endpoint}`);
  console.log(`$ pnpm exec ${tauriArgs.join(" ")}`);
  if (dryRun) return;

  const res = spawnSync("pnpm", ["exec", ...tauriArgs], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(res.status ?? 1);
}

main();
