#!/usr/bin/env node
/**
 * `pnpm tauri build` is the public updater build.
 * Every other `pnpm tauri …` subcommand is the Tauri CLI unchanged.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const command =
  args[0] === "build"
    ? ["node", resolve(repoRoot, "scripts/tauri-build.mjs"), ...args.slice(1)]
    : ["pnpm", "exec", "tauri", ...args];

const res = spawnSync(command[0], command.slice(1), {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});
process.exit(res.status ?? 1);
