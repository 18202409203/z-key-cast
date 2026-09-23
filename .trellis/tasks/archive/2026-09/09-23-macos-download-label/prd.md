# macOS download label

## Goal

官网下载区的主按钮标明这是 macOS 安装包。版本号、DMG 地址和体积仍从 `latest.json` 来。脚注写明这是 M 芯片包。访客点下去的是安装包，不是更新器用的压缩包。

## Background

- 下载区是第三块 snap：`website/src/lib/marketing/components/DownloadPanel.svelte`。现有版面是一颗居中白按钮加一行脚注。
- 主按钮文案现为「Download Latest Version」/「下载最新版本」，没有平台。
- `fetch-mac-download.ts` 已从 `/updates/latest.json` 取 `version`，并优先用 `darwin-*` 的 `installer`（用户 DMG）。`platforms.*.url` 是给应用内更新器的 `.app.tar.gz`。
- 当前只发布 `darwin-aarch64`。新 Mac 都是 Apple 芯片，不发布 Intel 包。

## Decisions

| 项 | 决定 |
|----|------|
| 按钮 | 一颗，文案写 macOS，链到 M 芯片 DMG |
| 架构说明 | 英文 Apple Silicon，中文 M 芯片 |
| Intel | 不支持，页面上不出现 |
| 平台列表 | 不按 `platforms` 的 key 数量渲染按钮 |
| 系统检测 | 不做 |
| 将来 | 最多再加 Windows。本任务不加 Windows 按钮 |

**定稿文案**

| Key | en | zh |
|-----|----|----|
| `download.panel.cta` | Download for macOS | 下载 macOS 版 |
| `download.panel.platform` | Apple Silicon | M 芯片 |

脚注一行：`Latest: {version}` · 平台文案 · `{size}`。没有体积时省略体积段。版本仍走现有 `cta.latest` / `version.none`。

```
最新：1.5.7 · M 芯片 · 2.8 MB
Latest: 1.5.7 · Apple Silicon · 2.8 MB
```

## Requirements

1. `/` 与 `/zh/` 的下载主按钮使用上表文案，链接是 `darwin-aarch64` 的 `installer`（清单缺失时指向 `/downloads/`）。
2. 脚注包含版本、平台文案；清单提供 `installer.size` 时再加体积。
3. 不新增第二颗按钮，不出现 Intel，不读取 Windows / Linux key，不根据浏览器平台改链接。
4. 更新 `.trellis/spec/guides/site-updater.md` 的 Download UI 约定，使脚注包含平台文案。
5. 版本脚注下加一行未公证说明：若提示已损坏，把应用拖进「应用程序」后执行 `xattr -dr com.apple.quarantine /Applications/z-key-cast.app`。同一说明写入根目录 `README.md` 与 `README.zh-CN.md`。

## Out of scope

- Intel / `darwin-x86_64` 构建、发布和下载入口
- Universal DMG
- 按 `platforms` 动态生成按钮
- 非 Mac 访客的单独提示
- Windows 下载
- 把 `platforms.*.url`（更新包）做成用户下载

## Acceptance Criteria

- [x] AC1: en 按钮为 “Download for macOS”，zh 按钮为「下载 macOS 版」
- [x] AC2: 有清单时脚注为版本 · 平台文案 · 体积（en: `Apple Silicon`；zh: `M 芯片`）；无体积时不出现体积段
- [x] AC3: 按钮只链到 `darwin-aarch64` 的 `installer`（或占位 `/downloads/`），不链到 `.app.tar.gz`，页面上没有 Intel
- [x] AC4: `pnpm website:check` 通过；`site-updater.md` 的 Download UI 与上述脚注一致
- [x] AC5: 下载页与根目录中英文 README 都写明未公证时的 `xattr -dr com.apple.quarantine /Applications/z-key-cast.app`
