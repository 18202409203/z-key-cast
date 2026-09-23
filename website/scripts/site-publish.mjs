#!/usr/bin/env node
/**
 * Core publish: sync website build (optional), copy updater/installer artifacts into
 * website/publish/ (release) or website/publish-test/ (test), write updates/latest.json.
 * Shared by site:publish and site:publish-test.
 *
 * Env:
 *   RELEASE_KIT_VERSION / SITE_PUBLISH_VERSION — version folder + manifest version
 *   UPDATE_BASE_URL — https prefix for the public manifest
 *   UPDATE_BASE_URL_TEST — LAN prefix for the --test manifest
 *   RELEASE_KIT_DRY_RUN=1 — print actions only
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadSiteEnv, websiteRoot } from "./site-env.mjs";

const args = new Set(process.argv.slice(2));
const isTest = args.has("--test");
const skipWeb = args.has("--skip-web");
const skipBuild = args.has("--skip-build");
const dryRun =
  args.has("--dry-run") ||
  process.env.RELEASE_KIT_DRY_RUN === "1" ||
  process.env.RELEASE_KIT_DRY_RUN === "true";

const {
  repoRoot,
  publishRoot,
  publishTestRoot,
  UPDATE_BASE_URL,
  UPDATE_BASE_URL_TEST,
} = loadSiteEnv({ apply: true });
const activeRoot = isTest ? publishTestRoot : publishRoot;
const baseUrl = isTest ? UPDATE_BASE_URL_TEST : UPDATE_BASE_URL;
const downloadsRoot = resolve(activeRoot, "downloads");
const updatesRoot = resolve(activeRoot, "updates");
const bundleRoot = resolve(repoRoot, "src-tauri/target/release/bundle");
const testVersionFile = resolve(websiteRoot, ".site-test-version");
const syncScript = resolve(websiteRoot, "scripts/site-sync-web.mjs");
const buildInternalScript = resolve(repoRoot, "scripts/tauri-build-internal.mjs");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function repoVersion() {
  return String(readJson(resolve(repoRoot, "package.json")).version);
}

function resolveVersion() {
  if (isTest) {
    if (existsSync(testVersionFile)) {
      const v = readFileSync(testVersionFile, "utf8").trim();
      if (v) return v;
    }
    return repoVersion();
  }
  const fromEnv =
    process.env.SITE_PUBLISH_VERSION ||
    process.env.RELEASE_KIT_VERSION ||
    "";
  if (fromEnv.trim()) return fromEnv.trim();
  return repoVersion();
}

function run(cmd, cmdArgs, opts = {}) {
  console.log(`$ ${cmd} ${cmdArgs.join(" ")}`);
  if (dryRun) return { status: 0 };
  const res = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env,
    shell: false,
    ...opts,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
  return res;
}

function syncWebsiteIntoPublish() {
  if (skipWeb) return;
  if (dryRun) {
    console.log(
      `[dry-run] sync website/build → ${relative(repoRoot, activeRoot)}/`,
    );
    return;
  }
  run("node", [syncScript, isTest ? "--test" : "--public"]);
}

/**
 * @param {string} dir
 * @param {(name: string) => boolean} pred
 * @returns {string[]}
 */
function findFiles(dir, pred) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (pred(name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

function readSig(sigPath) {
  return readFileSync(sigPath, "utf8").trim();
}

/**
 * @param {string} version
 */
function collectPlatforms(version) {
  /** @type {Record<string, { url: string, signature: string, size?: number, installer?: { url: string, size: number } }>} */
  const platforms = {};
  const versionUrl = `${baseUrl}/downloads/${encodeURIComponent(version)}`;

  const macosDir = join(bundleRoot, "macos");
  for (const tar of findFiles(macosDir, (n) => n.endsWith(".app.tar.gz"))) {
    const sig = `${tar}.sig`;
    if (!existsSync(sig)) {
      console.warn(`missing signature for ${tar}; skip`);
      continue;
    }
    const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
    const key = `darwin-${arch}`;
    const fileName = basename(tar);
    platforms[key] = {
      url: `${versionUrl}/${fileName}`,
      signature: readSig(sig),
      size: statSync(tar).size,
    };
    const dmgs = findFiles(
      join(bundleRoot, "dmg"),
      (n) => n.endsWith(".dmg"),
    );
    const dmg =
      dmgs.find((p) => basename(p).includes(version)) ?? dmgs[0];
    if (dmg) {
      platforms[key].installer = {
        url: `${versionUrl}/${basename(dmg)}`,
        size: statSync(dmg).size,
      };
    }
  }

  const nsisDir = join(bundleRoot, "nsis");
  for (const exe of findFiles(nsisDir, (n) => n.endsWith("-setup.exe"))) {
    const sig = `${exe}.sig`;
    if (!existsSync(sig)) continue;
    const fileName = basename(exe);
    platforms["windows-x86_64"] = {
      url: `${versionUrl}/${fileName}`,
      signature: readSig(sig),
    };
  }

  const msiDir = join(bundleRoot, "msi");
  for (const msi of findFiles(msiDir, (n) => n.endsWith(".msi"))) {
    const sig = `${msi}.sig`;
    if (!existsSync(sig)) continue;
    if (platforms["windows-x86_64"]) break;
    const fileName = basename(msi);
    platforms["windows-x86_64"] = {
      url: `${versionUrl}/${fileName}`,
      signature: readSig(sig),
    };
  }

  const appimageDir = join(bundleRoot, "appimage");
  for (const img of findFiles(appimageDir, (n) => n.endsWith(".AppImage"))) {
    const sig = `${img}.sig`;
    if (!existsSync(sig)) continue;
    const fileName = basename(img);
    platforms["linux-x86_64"] = {
      url: `${versionUrl}/${fileName}`,
      signature: readSig(sig),
    };
  }

  return platforms;
}

/**
 * @param {string} version
 */
function copyArtifacts(version) {
  const dest = join(downloadsRoot, version);
  if (dryRun) {
    console.log(`[dry-run] copy bundle artifacts → ${dest}`);
    return dest;
  }
  mkdirSync(dest, { recursive: true });

  const copyPred = (name) =>
    name.endsWith(".app.tar.gz") ||
    name.endsWith(".app.tar.gz.sig") ||
    name.endsWith(".dmg") ||
    name.endsWith("-setup.exe") ||
    name.endsWith("-setup.exe.sig") ||
    name.endsWith(".msi") ||
    name.endsWith(".msi.sig") ||
    name.endsWith(".AppImage") ||
    name.endsWith(".AppImage.sig");

  const files = findFiles(bundleRoot, copyPred);
  if (files.length === 0) {
    console.error(
      `No bundle artifacts under ${bundleRoot}. Run pnpm tauri build or pnpm tauri:build-test first.`,
    );
    process.exit(1);
  }
  for (const file of files) {
    const to = join(dest, basename(file));
    copyFileSync(file, to);
    console.log(`copied ${relative(repoRoot, file)} → ${relative(repoRoot, to)}`);
  }
  return dest;
}

function writeLatestJson(version, platforms) {
  const manifest = {
    version,
    notes: isTest ? `Local test publish ${version}` : `Release ${version}`,
    pub_date: new Date().toISOString(),
    platforms,
  };
  const outPath = join(updatesRoot, "latest.json");
  if (dryRun) {
    console.log(`[dry-run] write ${outPath}`);
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  mkdirSync(updatesRoot, { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`wrote ${relative(repoRoot, outPath)}`);
}

function maybeBuildInternal() {
  if (!isTest || skipBuild || dryRun) return;
  run("node", [buildInternalScript, "--bump-test-version"]);
}

function assertBaseUrl() {
  if (isTest) return;
  if (!baseUrl.startsWith("https://")) {
    console.error(
      "UPDATE_BASE_URL must be an https origin in website/.env. Refusing to write the public manifest.",
    );
    process.exit(1);
  }
}

function main() {
  assertBaseUrl();
  maybeBuildInternal();
  const version = resolveVersion();
  console.log(
    `site-publish${isTest ? " (test)" : ""}${dryRun ? " [dry-run]" : ""} version=${version} root=${relative(repoRoot, activeRoot)} base=${baseUrl}`,
  );

  syncWebsiteIntoPublish();
  copyArtifacts(version);
  const platforms = collectPlatforms(version);
  if (Object.keys(platforms).length === 0) {
    const msg =
      "No signed updater artifacts found (need *.sig next to archives). Internal builds require createUpdaterArtifacts + TAURI_SIGNING_PRIVATE_KEY.";
    if (dryRun) {
      console.warn(`[dry-run] ${msg}`);
      writeLatestJson(version, {
        "darwin-aarch64": {
          url: `${baseUrl}/downloads/${encodeURIComponent(version)}/example.app.tar.gz`,
          signature: "<dry-run>",
          size: 0,
          installer: {
            url: `${baseUrl}/downloads/${encodeURIComponent(version)}/example.dmg`,
            size: 0,
          },
        },
      });
      console.log(
        `done (dry-run). Manifest would be at ${baseUrl}/updates/latest.json`,
      );
      return;
    }
    console.error(msg);
    process.exit(1);
  }
  writeLatestJson(version, platforms);
  console.log(`done. Manifest: ${baseUrl}/updates/latest.json`);
  if (isTest) console.log("Serve with: pnpm site:serve-test");
}

main();
