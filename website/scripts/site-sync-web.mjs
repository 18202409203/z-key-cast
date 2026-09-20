#!/usr/bin/env node
/** Sync website/build → website/publish while preserving downloads/ and updates/. */
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
import { publishRoot, repoRoot, websiteRoot } from "./site-env.mjs";

const websiteBuild = resolve(websiteRoot, "build");
const skipBuild = process.argv.includes("--skip-build");

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

function sync() {
  ensureBuild();
  mkdirSync(join(publishRoot, "downloads"), { recursive: true });
  mkdirSync(join(publishRoot, "updates"), { recursive: true });

  for (const name of readdirSync(publishRoot)) {
    if (name === "downloads" || name === "updates" || name === ".gitkeep") continue;
    rmSync(join(publishRoot, name), { recursive: true, force: true });
  }

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const from = join(dir, name);
      const to = join(publishRoot, relative(websiteBuild, from));
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
    `synced ${relative(repoRoot, websiteBuild)} → ${relative(repoRoot, publishRoot)}`,
  );
}

sync();
