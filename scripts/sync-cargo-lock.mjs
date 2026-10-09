#!/usr/bin/env node
/**
 * Rewrite the workspace package version in src-tauri/Cargo.lock.
 *
 * release-kit bumps Cargo.toml but does not touch the lockfile, so the next
 * cargo command dirties the tree. Run this from hooks.postbump, before git add.
 *
 * Version: argv[2], else RELEASE_KIT_VERSION.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = resolve(repoRoot, "src-tauri/Cargo.lock");
const version = process.argv[2] || process.env.RELEASE_KIT_VERSION || "";

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(
    "sync-cargo-lock: pass a semver, or set RELEASE_KIT_VERSION",
  );
  process.exit(1);
}

const raw = readFileSync(lockPath, "utf8");
const block =
  /\[\[package\]\]\nname = "z-key-cast"\nversion = "[^"]+"\n/;
if (!block.test(raw)) {
  console.error("sync-cargo-lock: z-key-cast package block not found");
  process.exit(1);
}

const next = raw.replace(
  block,
  `[[package]]\nname = "z-key-cast"\nversion = "${version}"\n`,
);
if (next === raw) {
  console.log(`sync-cargo-lock: already ${version}`);
} else {
  writeFileSync(lockPath, next);
  console.log(`sync-cargo-lock: z-key-cast → ${version}`);
}
