# 官网

[English](./README.md) | 简体中文

静态官网：页面、安装包、`updates/latest.json`。本包与仓库根目录 Tauri 应用的 `src/` 解耦。发布脚本、密钥和两个部署根都在 `website/` 下。

命令都在**仓库根目录**执行。页面只构建一次（`pnpm website:build` → `website/build/`），公网和测试各拷一份。两边的 `downloads/` 和 `updates/latest.json` 分开。

## 目录

```text
website/
  src/ …                 # SvelteKit 源码
  scripts/               # 同步 / 发布 / 局域网服务
  keys/                  # 测试 updater 密钥（公钥可提交；私钥 gitignore）
  env.example            # 复制为 website/.env
  publish/               # 公网根（除 .gitkeep 外 gitignore）
    downloads/<version>/
    updates/latest.json  # 绝对地址来自 UPDATE_BASE_URL
  publish-test/          # 局域网测试根（除 .gitkeep 外 gitignore）
    downloads/<version>/
    updates/latest.json  # 绝对地址来自 UPDATE_BASE_URL_TEST
```

`website/.env`：

| 变量 | 谁用 | 当前值 |
|---|---|---|
| `UPDATE_BASE_URL` | 公网清单。必须是 `https://`，否则 `site:publish` 拒绝写入 | `https://z-key-cast.1224777638.workers.dev` |
| `UPDATE_BASE_URL_TEST` | 测试包里的更新地址，以及 `publish-test` 清单。要和 `site:serve-test` 的访问地址一致 | 例如 `http://192.168.16.129:4173` |

## 公网发布

一键生成 `website/publish/`：

```bash
pnpm site:dist
```

等价于：

```bash
pnpm tauri build          # 公网包：自动更新，公钥 updater.key.pub，地址 UPDATE_BASE_URL
pnpm website:build        # 官网页面
pnpm site:publish         # 拷入 publish/downloads/<版本>/，写 latest.json
```

版本来自 `package.json`（或 release-kit 环境变量），不会抬升 `.site-test-version`。`site:publish` 也挂在 release-kit 的 `postrelease` 上，那时假定 App 和页面已经打好。

生成后把 `website/publish/` 上传到 Cloudflare Workers（`UPDATE_BASE_URL` 那个源）。上传不在这条命令里。

不带自动更新的临时包用 `pnpm tauri:build-once`。密钥生成见 [`keys/README.zh-CN.md`](./keys/README.zh-CN.md)。

## 测试发布

一键生成 `website/publish-test/`：

```bash
pnpm site:dist-test
```

等价于：

```bash
pnpm tauri:build-test -- --bump-test-version   # .site-test-version 的 patch +1，并打测试包
pnpm website:build
pnpm site:publish-test -- --skip-build         # 只拷贝和写清单，不再编译第二次
```

测试包启用 updater，嵌入 `website/keys/updater.test.key` 对应的公钥，更新地址是 `UPDATE_BASE_URL_TEST`。不会改 `package.json`、Cargo 或 `tauri.conf.json`。

本地看测试站：

```bash
pnpm site:serve-test    # 默认 0.0.0.0:4173，文档根 = website/publish-test/
```

### 局域网更新闭环（macOS）

1. 复制 `website/env.example` → `website/.env`，把 `UPDATE_BASE_URL_TEST` 设成这台机器的局域网地址（例如 `http://192.168.16.129:4173`）。
2. 测试私钥放在 `website/keys/updater.test.key`（gitignore）。公钥已入库。
3. 先装一个较低版本当旧版（这一步不抬升版本号）：

   ```bash
   pnpm tauri:build-test
   # 安装 src-tauri/target/release/bundle/ 下的 .dmg / .app
   ```

4. 再发布一个更高的测试版本并打开静态服务：

   ```bash
   pnpm site:dist-test
   pnpm site:serve-test
   ```

5. 旧版 App → **关于** → **检查更新** → 下载 → 安装 → 重启。

## 分步命令

两条流水线的中间步骤。`src-tauri/target/release/bundle/` 只有一份，后打的包会盖掉先打的。

| 命令 | 作用 |
|---|---|
| `pnpm website:dev` | 只开页面开发服务器（`http://localhost:5173`），不含下载包和更新清单。 |
| `pnpm website:build` | 页面构建到 `website/build/`。 |
| `pnpm website:check` | 对 website 包跑 `svelte-check`。 |
| `pnpm tauri build` | 公网 App，带自动更新。 |
| `pnpm tauri:build-once` | 临时 App，不带自动更新，不签名更新包。 |
| `pnpm tauri:build-test` | 测试 App。默认不抬升 `.site-test-version`；`--bump-test-version` 才 +1。 |
| `pnpm site:sync` | 只把页面同步到 `website/publish/`，保留该目录的 `downloads/` 与 `updates/`。 |
| `pnpm site:sync-test` | 同样同步到 `website/publish-test/`。 |
| `pnpm site:publish` | 把当前 bundle 拷进公网根并写清单。不编译 App。 |
| `pnpm site:publish-test` | 测试版本 +1、编译测试包、写入 `publish-test/`。 |
| `pnpm site:serve-test` | 局域网提供 `publish-test/`。 |

```bash
pnpm site:publish -- --dry-run
pnpm site:publish -- --skip-web              # 跳过页面同步
pnpm site:publish-test -- --dry-run
pnpm site:publish-test -- --skip-build       # 复用已有 bundle，不抬升版本、不再编译
```
