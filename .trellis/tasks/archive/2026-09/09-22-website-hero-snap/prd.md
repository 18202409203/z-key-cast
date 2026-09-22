# Marketing first-screen viewport + scroll snap

## Goal

营销页按 **三区 scroll-snap** 分区（参考 `design/website/scroll.jpeg`）：① Brand → ② Stage → ③ Download（含语言 footer）；各区在主流电脑视口内完整可读。

## Background

- 页面：`website/src/lib/marketing-page.svelte`（`/` 与 `/zh/` 共用）。
- 示意图：`design/website/scroll.jpeg`。
- Manifest：`/updates/latest.json` 已能解析 macOS 产物 URL；Windows 为占位。
- `mandatory` snap 会把末区之后的独立 footer 吸回第三屏，故语言切换改入 ③。

## Requirements

### Must

1. **三区 snap**：① Brand（名 + tagline，无卖点卡）→ ② Stage（交互台 + Desk 电源键 + 短说明）→ ③ Download（示意风大标题 + macOS 主 CTA + **语言 footer**）；`#downloads` 保留。
2. **Footer 进第三屏**：语言切换在 Download 面板底部；不做第四 snap，也不放在末区之后。
3. **视口适配**：主流电脑（含矮本 1366×768 / 1440×900、1080p、常见 MacBook 逻辑分辨率）下各区关键内容不被裁切；Stage 过矮时缩小/收紧，不只靠 `max-width`。
4. **Snap**：`scroll-snap-type: y mandatory` + 面板 `scroll-snap-stop: always`；Brand/Stage 底部轻量滚动暗示；`prefers-reduced-motion: reduce` 时关闭 snap 与暗示动效。
5. **下载**：本任务仅 macOS 一按钮；布局可扩展为日后 macOS | Windows 并排。
6. **Stage 电源**：Desk 右上角 ⏻ 键双向切换；保留点 desk 开机、点外侧关机（含滚动箭头）、关后按键唤醒。**进页默认关**；**第一次** Stage 过半入视口时自动开一次，之后不再自动开。去掉 On/Off 状态胶囊。
7. **不破坏**：stage 捕获 / 记事本 / HUD / cable；动画不得残留破坏 HUD 的 `transform` containing block。

### Should

8. ③ 文案精简；footer 弱视觉沉底。
9. 验收：矮本、1080p、1440p、浏览器 110%/125% 缩放。

### Out of scope

- Brand 三枚卖点卡 → 后补任务
- Windows 下载按钮 → 后补（并排）
- 黑白主题 → `09-21-website-theme`
- App / HUD 共享包行为变更（非必须时）
- 手机优先大改版

## Decisions (locked)

| 项 | 决定 |
|----|------|
| 分区 | 三区 Brand / Stage / Download；语言 footer **融入** ③ |
| Snap | `mandatory` + `scroll-snap-stop: always`；reduced-motion 关闭 |
| 卖点卡 | 后补 |
| 下载 | 仅 macOS；预留并排双按钮布局 |
| ③ 文案 | 示意风标题 + Download Latest 式 CTA；en/zh 在 `i18n.ts` |
| 电源键 | Desk 右上角；双向 + 保留隐式开关；进页关；首次入 Stage 视口自动开一次；无状态胶囊 |

## Acceptance Criteria

- [x] 三区 snap：Brand → Stage → Download；语言 footer 在第三屏底部（非独立滚出区）
- [x] 各 snap 区在约定分辨率下关键内容完整可见
- [x] ③ 仅 macOS 主按钮；无 Windows 入口；可扩展并排
- [x] `#downloads` 可用；只停在分区；Brand/Stage 有滚动暗示；reduced-motion 下无难受强 snap
- [x] Desk 电源键可开关；外侧点击仍可关；进页关、首次入 Stage 才自动开一次；无 On/Off 胶囊
- [x] `pnpm website:check` 与 `pnpm website:build` 通过；stage demo 可用
