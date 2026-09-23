#!/usr/bin/env node
/**
 * Sync website/build pages into a publish root, preserving downloads/ and updates/.
 * Flags: --public (default) syncs website/publish/. --test syncs website/publish-test/.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { publishRoot, publishTestRoot, repoRoot, websiteRoot } from "./site-env.mjs";

const websiteBuild = resolve(websiteRoot, "build");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const wantTest = args.has("--test");
const wantPublic = args.has("--public");

function ensureBuild() {
  if (existsSync(join(websiteBuild, "index.html"))) return;
  if (skipBuild) {
    console.error("website/build missing; run pnpm website:build");
    process.exit(1);
  }
  const res = spawnSync("pnpm", ["--filter", "z-key-cast-website", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

/**
 * @param {string} root
 */
function syncInto(root) {
  mkdirSync(join(root, "downloads"), { recursive: true });
  mkdirSync(join(root, "updates"), { recursive: true });

  for (const name of readdirSync(root)) {
    if (name === "downloads" || name === "updates" || name === ".gitkeep") continue;
    rmSync(join(root, name), { recursive: true, force: true });
  }

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const from = join(dir, name);
      const to = join(root, relative(websiteBuild, from));
      if (statSync(from).isDirectory()) {
        mkdirSync(to, { recursive: true });
        walk(from);
      } else {
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    }
  };
  walk(websiteBuild);
  console.log(
    `synced ${relative(repoRoot, websiteBuild)} → ${relative(repoRoot, root)}`,
  );
}

function sync() {
  ensureBuild();
  /** @type {string[]} */
  const roots = [];
  if (wantTest) roots.push(publishTestRoot);
  if (wantPublic || !wantTest) roots.push(publishRoot);
  for (const root of roots) syncInto(root);
}

sync();
