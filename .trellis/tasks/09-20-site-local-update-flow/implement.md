# Implement — 官网本地流程与更新检查联调

## Checklist

1. [x] 脚手架 `website/`（SvelteKit + TS + adapter-static），pnpm 脚本可独立 dev/build；与 Tauri `src/` 隔离
2. [x] 单页结构壳：品牌/一句话/截图位/下载按钮位/版本信息（无视觉定稿）
3. [x] 约定静态根目录与 gitignore（`website/publish`、私钥、本机基址、测试版本号）
4. [x] 示例配置入库（`website/env.example`）；文档说明本机复制方式
5. [x] 生成测试密钥对；公钥接入内测 updater 配置；私钥不入库（`website/keys/`）
6. [x] 接入 `tauri-plugin-updater`；构建变体：内测开 / 公开关
7. [x] About 面板：手动检查更新 UI + i18n 文案（en/zh 与现有一致）
8. [x] 实现 `site:publish-artifacts` 核心命令（拷贝包、签名、写 latest.json）
9. [x] 实现 `site:publish-test`：本地测试版本号、不 bump 仓库真版本
10. [x] `release.config.mjs` 钩子调用核心命令；确认与手动 Gitee 流程无冲突
11. [x] 局域网静态服务方式（`website/publish` serve）可文档化一键
12. [ ] macOS 联调验收 C：旧内测包 → 发布更高测试版本 → 检查更新 → 安装重启
13. [x] 确认公开构建路径无 updater / 无测试公钥；简短联调 README 段写入 `website/`
14. [x] Colocate site scripts/keys/env/publish under `website/`; remove repo-root `site/`

## Check notes (2026-09-20)

- Verified: `pnpm check`, `pnpm website:check`; dry-run publish resolves to `website/publish/`.
- Still open (manual): checklist item 12 — macOS C-loop on a real installed internal build.

## Validation commands

```bash
# website 壳
pnpm website:dev
pnpm website:build
pnpm website:check

# 类型/既有检查（应用）
pnpm check

# 发布测试轨道
pnpm site:publish-test

# 内测构建 + 手动在 About 走 C 级闭环（人工）
pnpm tauri:build:internal
pnpm site:serve
```

## Review gates

- 人工：macOS C 级闭环一次成功
- 人工：`git status` 无私钥、无 dmg、无本机基址、无测试版本号误入
- 人工：公开/默认 release 配置抽查无 updater endpoint

## Rollback points

- 可整段回滚：删除 `website/`、移除 updater 插件与 About 入口、还原 `release.config.mjs` hooks
- 测试密钥作废不影响已发布 Gitee 用户包（本就不含 updater）

## Notes for implementers

- Active task: `.trellis/tasks/09-20-site-local-update-flow`
- About 入口：`src/lib/panels/AboutPanel.svelte`
- Site scripts: `website/scripts/`; app internal build: `scripts/tauri-build-internal.mjs`

### Landed commands / paths

| Command | Role |
|---|---|
| `pnpm website:*` | SvelteKit site under `website/` (pnpm workspace filter) |
| `pnpm tauri:build:internal` | Internal updater build; signs with `website/keys/updater.test.key` |
| `pnpm site:publish-artifacts` | Core publish → `website/publish/` (release-kit `postrelease`) |
| `pnpm site:publish-test` | Bump `website/.site-test-version`, rebuild, publish |
| `pnpm site:serve` | Serve `website/publish/` on `:4173` |

Public `pnpm tauri build` does **not** pass `internal-updater` or internal merge configs. Gitee upload remains manual.
