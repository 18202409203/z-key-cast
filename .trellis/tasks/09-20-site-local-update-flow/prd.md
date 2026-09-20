# 官网本地流程与更新检查联调

## Goal

在本仓落地可局域网联调的「官网静态壳 + 同机安装包/更新清单 + macOS updater C 级闭环 + 与 release-kit 共用的发布命令」，打通本地流程；不对外启用更新、不改 Gitee Release 习惯、不做官网视觉定稿。

## Background

- 产品：z-key-cast（Tauri 2 + SvelteKit），发布目前靠 Gitee Releases，维护者手动上传。
- 尚无 `tauri-plugin-updater`；无独立官网。
- grilling 已对齐：先本地/局域网把流程跑通；公网域名、Cloudflare、官网样式另议。

## Requirements

### R1 — 本仓官网壳（内部测试）

- 在本仓新增独立 `website/`（SvelteKit + TypeScript + `adapter-static`），与 Tauri 应用 `src/` 路由/构建解耦。
- 内部测试用单页结构壳即可：产品名、一句话、截图位、按平台下载入口、版本信息（可链到仓库 changelog）。
- **官网视觉/信息架构另开任务**；本任务不追求设计定稿。

### R2 — 同机静态资源与更新清单

- 官网与安装包、`/updates/latest.json`（或等价路径）部署在同一静态根（本机/局域网）。
- 下载与 updater 均指向同机 URL；**不**把 Gitee 当更新权威源。
- Gitee Releases **继续**由维护者手动维护，本任务不改其流程、不自动上传 Gitee。

### R3 — 局域网 updater C 级闭环（macOS 优先）

- 调试/内测构建接入 `tauri-plugin-updater`。
- 验收：**检查更新 → 下载 → 签名校验 → 安装 → 重启到新版本**（级别 C）。
- 第一优先级：**macOS**；Windows 仅预留清单/下载字段，不承诺本任务 C 级通过。
- About（或 Settings 明确入口）提供**手动**「检查更新」；无启动强弹、无静默强更。

### R4 — 密钥与公开发布边界

- 本阶段使用**可丢弃的测试密钥**：公钥可入库；私钥本机保存，**禁止进 git**。
- 正式上线域名/公网时再生成生产密钥；旧测试包无法升级可接受。
- **公开发布包（含 Gitee Release 安装包）不接入 updater**（不嵌入测试公钥、不启用更新检查），避免测试信任链进入用户包。

### R5 — 发布工作流（真实可复用 + 测试隔离）

- 提供真实可用的核心命令（如 `site:publish-artifacts`）：签名、拷贝到静态目录、写 `latest.json`。
- `release-kit` 钩子调用同一核心命令（正式发版路径）；日常联调不必每次跑完整 release。
- 另提供 `site:publish-test`（或等价）：**不** bump 仓库 `package.json` / Cargo / tauri 版本、不写 CHANGELOG、不打 tag；版本来自 **gitignore 本地测试版本号**。
- 调试包基址：示例配置入库 + 本机 gitignore 实配局域网 `UPDATE_BASE_URL`；仅 debug/内测构建读取。

### R6 — 仓库内容边界

- **提交**：`website/` 源码、`website/scripts/`、`website/env.example`、测试公钥、清单说明；站点关注点均落在 `website/` 下。
- **gitignore**：`website/build`、`website/publish/**`（部署根）、测试私钥、`website/.env`、`website/.site-test-version`。
- **部署根**：sole document root = `website/publish/`（页面 + `downloads/` + `updates/latest.json`）；仓库根不再使用 `site/`。

## Out of scope

- 官网视觉设计、文案打磨、多语言站点、文档站/博客/CMS
- Cloudflare / 自定义域名 / 公网启用 updater / 生产密钥正式启用
- 改变现有 Gitee Release 手动维护方式
- Windows/Linux updater C 级验收
- 启动时自动检查更新、强制更新策略

## Acceptance Criteria

- [ ] 本仓存在独立可 `dev`/`build` 的 `website/` 静态站壳，局域网可打开单页并看到下载入口
- [ ] 本机脚本可将 macOS 测试包与 `latest.json` 发布到同机静态根；`site:publish-test` 不修改仓库真版本文件
- [ ] release-kit 配置中有钩子调用与正式路径共用的 publish 核心命令（可 dry-run/文档说明触发条件）
- [ ] 内测/debug 构建：About 可手动检查更新，并在局域网上完成 macOS C 级闭环（验签安装重启）
- [ ] 默认公开/release 构建路径不启用 updater（或不嵌入测试公钥）
- [ ] 私钥与本机基址、测试版本号、安装包/生成清单均被 gitignore；仓库含示例配置
- [ ] 文档（任务内 notes 或简短 README 段）说明：局域网联调步骤、与 Gitee 手动 Release 的关系、将来换生产钥/域名时只换基址与密钥

## Notes

- 将来托管（VPS 或 Cloudflare）= 同步同一 `website/publish/` 静态根结构 + 换 HTTPS 基址 + 换生产密钥；本任务只要求本地结构可迁移，不实现云上部署。
- 子任务候选（本单不建）：官网视觉研讨；公网启用 updater。
