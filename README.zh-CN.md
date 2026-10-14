# z-key-cast

[English](./README.md) | 简体中文

录屏时在屏幕角落显示键盘与鼠标操作的跨平台 HUD。

- **官网：** https://z-key-cast.1224777638.workers.dev/zh/

<p align="center">
  <img src="./docs/screenshots/black.png" alt="浅色背景 Full HUD" width="420" />
  &nbsp;
  <img src="./docs/screenshots/white.png" alt="深色背景 Full HUD" width="420" />
</p>
<p align="center">
  <img src="./docs/screenshots/lite.png" alt="Lite 预设操作时间线" width="520" />
</p>

## 安装

仅 macOS（M 芯片）。应用尚未公证。若系统提示「已损坏」，把 `z-key-cast.app` 拖进「应用程序」后执行：

```bash
xattr -dr com.apple.quarantine /Applications/z-key-cast.app
```

## 功能

- **角落 HUD** — Text · Lite · Full 三档预设；可改四角位置，支持拖拽放置
- **全局捕获** — 键盘与鼠标（macOS / Windows；Linux 视平台能力）
- **托盘** — 打开设置、退出（运行期间 HUD 常开；X 仅隐藏设置窗）
- **点击涟漪** — macOS / Windows 主屏可选点击圆环
- **多语言** — 界面中英切换

## 技术栈

- Tauri 2
- SvelteKit + TypeScript
- pnpm

## 开发

```bash
pnpm install
pnpm tauri dev
```

`git push` 推到 Gitee（`origin`）。把当前分支抄到 GitHub：`git push github HEAD`。

| 窗口 | 路由 | 用途 |
|---|---|---|
| `main` | `/` | 设置 / 日志 / 关于 |
| `overlay` | `/overlay` | 透明角落 HUD |

打包：

```bash
pnpm tauri build
```

### 官网发布

见 [`website/README.zh-CN.md`](./website/README.zh-CN.md)（[English](./website/README.md)）。

| 方式 | 命令 | 目录 |
|---|---|---|
| 公网 | `pnpm site:dist` | 只写入 `website/publish/`，不部署 |
| 发版 | `pnpm release` | 打 tag、写入 `website/publish/`，再 `wrangler deploy` |
| 测试 | `pnpm site:dist-test` | `website/publish-test/` |

`pnpm tauri build` 带自动更新。不带更新的临时包是 `pnpm tauri:build-once`。单独的 `pnpm site:publish` 不会部署。`pnpm release` 在 `site:publish` 之后用 Wrangler 上传 `website/publish/`。单个 `.dmg` 或 `.app.tar.gz` 超过 25 MiB 时，`wrangler deploy` 会失败。Gitee Release 仍为手动上传。更新密钥见 [`updater-keys/README.zh-CN.md`](./updater-keys/README.zh-CN.md)。

## 文档

- 产品与架构 → [`design/index.md`](./design/index.md)
- UI 说明 → [`design/02-ui.md`](./design/02-ui.md)
- 更新日志 → [`CHANGELOG.md`](./CHANGELOG.md)

## 许可

MIT
