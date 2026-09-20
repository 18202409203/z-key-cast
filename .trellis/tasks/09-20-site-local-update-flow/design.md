# Design — 官网本地流程与更新检查联调

## Boundaries

| 进 | 出 |
|---|---|
| `website/` 静态站壳 + `website/publish/` 部署根 | 视觉定稿、公网托管 |
| 同机静态根（`website/publish`）：页面 + downloads + updates 清单 | Gitee 自动上传 |
| `tauri-plugin-updater`（仅 debug/内测） | 公开 release 启用更新 |
| publish 核心命令 + release-kit 钩子 + publish-test | CI 云部署 |
| macOS C 级闭环 | Windows updater 验收 |

## Architecture

```text
[开发者本机]
  tauri build (debug/内测, 测试公钥 + UPDATE_BASE_URL)
       │
       ▼
  site:publish-test  ──►  website/publish/
                          ├─ (website build pages)
                          ├─ downloads/<version>/*.dmg / *.app.tar.gz (等)
                          └─ updates/latest.json
       │
       ▼
  局域网 HTTP 静态服务  ◄──  已安装的内测 App（手动检查更新）
       │
       ▼
  updater: 读 latest.json → 下包 → 验签 → 安装 → 重启

[正式发版路径 · 本任务只接线不强制每次跑]
  pnpm release → (可选 build) → hooks → site:publish-artifacts
  Gitee Release 仍人工上传（权威对外安装包渠道不变）
```

## Contracts

### 静态根布局（约定）

Sole document root: **`website/publish/`**

- `UPDATE_BASE_URL` + `/updates/latest.json` — updater 入口（稳定路径，内容可变）
- `UPDATE_BASE_URL` + `/downloads/<version>/...` — 安装包
- 页面下载按钮指向同机 `/downloads/...`（内部测试）

Local config: `website/env.example` → `website/.env`；keys under `website/keys/`；test version at `website/.site-test-version`.

### 版本双轨

| 轨道 | 版本来源 | 影响仓库 version 文件 |
|---|---|---|
| 真版本 | release-kit bump | 是 |
| 测试版本 | gitignore 本地计数/覆盖 | 否 |

Updater 比较的是**嵌入安装包的版本**与清单中的版本；测试轨道必须能独立抬高测试版本号。

### 构建变体

- **内测/debug**：嵌入测试公钥；updater endpoint = 本机 `UPDATE_BASE_URL`；About 显示检查更新。
- **公开 release**：不启用 updater（配置层关闭或条件编译/构建标志）；About 无更新入口或显示未配置。

### 密钥

- 测试密钥对：公钥进仓；私钥路径可配置且 gitignore。
- 生产密钥：本任务不生成启用；文档注明上线时轮换。

## Data flow（检查更新）

1. 用户在 About 点「检查更新」
2. 前端调用 updater API
3. 插件 GET `latest.json`，比较版本
4. 若有更新：确认 → 下载 URL（同机）→ 验签 → 安装 → 重启
5. 失败：面板展示可理解错误（网络/验签/已最新）

## Integration with release-kit

- 现有 `release.config.mjs`：`hooks` 增加对 publish 核心命令的调用（建议 `postrelease` 或 build 之后；`onError: 'warn'` 与否在 implement 阶段按体验选定，默认 fail 更安全）。
- 核心命令读取 `RELEASE_KIT_VERSION` / `RELEASE_KIT_TAG`（钩子环境）或 CLI 参数（测试路径）。
- `build.run` 仍可保持 false；需要产物时显式 `--build` 或由文档约定先 `pnpm tauri build`。

## Compatibility / migration shape

- 目录约定稳定后，迁 VPS/Cloudflare = 上传同一 `website/publish/` + 换基址 + 换生产钥。
- 不依赖 Cloudflare 特有 API；`wrangler` 等不在本任务范围。

## Risks

| 风险 | 缓解 |
|---|---|
| 测试公钥误入公开包 | 构建标志/配置分离；验收检查公开构建无 updater |
| 私钥误提交 | gitignore + 文档；PR/自检 |
| 局域网 IP 变化 | gitignore 本机基址；脚本打印当前建议 URL |
| 大包进 git | downloads/ 与生成清单忽略 |
| Tauri 签名/公证与 updater 叠加复杂 | 本任务聚焦 updater 签名；公证问题记入 notes，不阻塞局域网 C |
