# 官网（局域网内测壳）

[English](./README.md) | 简体中文

用于 **本机 / 局域网** 演练「展示页 + 下载 + 更新检查」的静态站点壳。视觉设计刻意未定稿。

本包与仓库根目录 Tauri 应用的 `src/` **解耦**。站点发布/服务脚本、密钥与部署根均在 `website/` 下。

## 目录结构

```text
website/
  src/ …                 # SvelteKit 源码
  static/
  scripts/               # site-sync / publish / serve
  keys/                  # 测试用 updater 密钥（公钥可提交；私钥 gitignore）
  env.example            # 复制为 website/.env
  publish/               # 唯一部署 / 文档根（除 .gitkeep 外 gitignore）
    index.html …
    downloads/<version>/
    updates/latest.json
  README.md
  README.zh-CN.md
```

## 命令说明

以下命令均在 **仓库根目录** 执行。

### 官网（SvelteKit）

| 命令 | 作用 |
|---|---|
| `pnpm website:dev` | 只开发页面源码（`http://localhost:5173`）。不含 `publish/` 下的下载包与更新清单。 |
| `pnpm website:build` | 将静态页面构建到 `website/build/`。 |
| `pnpm website:check` | 对 website 包跑 `svelte-check`。 |

### 部署根（`website/publish/`）

| 命令 | 作用 |
|---|---|
| `pnpm site:sync-web` | 仅把 `website/build/` **页面**同步到 `website/publish/`。保留 `downloads/` 与 `updates/`。若缺少 `build/` 会先构建官网。 |
| `pnpm site:serve` | 把 `website/publish/` 当作 HTTP 文档根提供服务（默认端口 `4173`，局域网可访问）。该地址应配置为 `UPDATE_BASE_URL`。 |
| `pnpm site:publish-artifacts` | 将当前 Tauri 打包产物拷到 `publish/downloads/<version>/`，并写入 `updates/latest.json`。版本来自 release-kit 环境变量 / `package.json`。**不会**抬升测试版本。已挂到 release-kit 的 `postrelease` 钩子。 |
| `pnpm site:publish-test` | **测试更新路径：** 将 gitignore 的 `website/.site-test-version` patch +1，用该版本做一次内测 Tauri 重建，再发布到 `publish/` 并写 `latest.json`。**不会**改 `package.json` / Cargo / `tauri.conf.json`。 |

发布相关参数：

```bash
pnpm site:publish-test -- --skip-build   # 复用已有 bundle；不因 bump 再编
pnpm site:publish-test -- --dry-run      # 只打印将要做的事
pnpm site:publish-artifacts -- --skip-web  # 跳过站点页面同步
```

### 桌面内测构建（启用 updater）

| 命令 | 作用 |
|---|---|
| `pnpm tauri:build:internal` | 打出 **内测** 包：启用 updater、嵌入测试公钥，endpoint 来自 `UPDATE_BASE_URL`。产物在 `src-tauri/target/release/bundle/`。默认**不**抬升 `.site-test-version`；带 `--bump-test-version` 时才会（`site:publish-test` 内部会带上）。 |
| `pnpm tauri build` | **公开**构建。不启用 updater / 不嵌入测试公钥。用于正式 Gitee Release（仍为手动上传）。 |

### 命令关系

```text
tauri:build:internal     →  产出可安装的内测 .app/.dmg（先装这个当「旧版」）
site:publish-test        →  测试版本 +1 + 重建内测包 + 拷入 publish/ + 写 latest.json
site:sync-web            →  仅同步页面进 publish/（publish / serve 流程里也会用到）
site:serve               →  HTTP 根 = website/publish/  （即 UPDATE_BASE_URL）
```

`UPDATE_BASE_URL`（写在 `website/.env`）必须与用户/App 访问 `site:serve` 的源一致（例如 `http://192.168.x.x:4173`）。它会打进内测包，也会写进 `latest.json` 里的绝对下载 URL。

`.site-test-version` **仅**在执行 `site:publish-test` 时自动 +1（经内部 `--bump-test-version`）。即便是假版本号，也必须重新 build，版本才会嵌进二进制。

## 局域网 C 级闭环（macOS）

1. 复制 `website/env.example` → `website/.env`，将 `UPDATE_BASE_URL` 设为与 `site:serve` 相同的 host:port（例如 `http://192.168.16.129:4173`）。
2. 测试私钥放在 `website/keys/updater.test.key`（gitignore）。公钥已入库。
3. 构建并安装一个 **较低** 的内测基线（不会自动 bump）：

   ```bash
   pnpm tauri:build:internal
   # 安装 src-tauri/target/release/bundle/ 下的 .dmg / .app
   ```

4. 把 **更高** 的测试版本发布到静态根：

   ```bash
   pnpm site:publish-test
   ```

5. 启动静态服务：

   ```bash
   pnpm site:serve
   ```

6. 打开已安装的旧版 App → **关于** → **检查更新** → 下载 → 安装 → 重启。

### 人工验收清单

- [ ] macOS C 环跑通一次：检查 → 下载 → 验签 → 安装 → 重启到新版本
- [ ] `git status` 无私钥、无 `website/publish/` 下的 dmg/tar、无 `website/.env`、无 `website/.site-test-version`
- [ ] 默认 `pnpm tauri build`（无 `--features internal-updater`、无合并 `tauri.internal.conf.json`）不嵌入 updater 公钥、不注册 updater 插件

## 以后上生产

迁到公网托管时：上传同样的 `website/publish/` 目录结构，把 `UPDATE_BASE_URL` 换成 HTTPS，并 **重新生成** 生产密钥对（不要复用测试私钥）。
