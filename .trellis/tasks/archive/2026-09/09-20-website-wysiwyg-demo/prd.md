# 官网所见即所得键盘预览

## Goal

把官网从「下载壳」升级为：**第一视口可玩、与 App Full HUD 同源视图** 的极简单页；用浏览器键鼠事件驱动同一套 HUD 视图，降低下载前认知摩擦。保留下载与版本入口。本期实现 MVP，视觉定稿另开。

## Background

- 产品：z-key-cast — 录屏角落键鼠 HUD（Text / Lite / Full）。
- App 输入：原生全局 hook → `HudChip` → `createHudSlots` → `HudView`。
- 官网 `website/`：局域网下载 + updater 壳；截图位 placeholder；视觉/IA 曾明确另开（本任务承接 IA + live demo MVP）。
- `website/` 与 Tauri `src/` 解耦（独立 SvelteKit）；已有 pnpm workspace（`.` + `website`）。

## Decisions

| 项 | 选择 |
|----|------|
| 首屏主目标 | 可玩预览优先；下载为次要 CTA |
| Demo HUD | MVP 固定 Full；后续可切换 Text/Lite/Full |
| 站点形态 | 极简单页：Hero(demo) → 能力边界 → Downloads → Version |
| 本期交付 | 规划 + 实现 MVP；视觉定稿另开 |
| Web 输入 | 键 + 鼠按键 + 滚轮；复刻 Full HUD；唯一差异是事件源（DOM vs 原生 hook） |
| 组件策略 | 抽共享视图包；App / website 共用视图层 |
| 共享包范围 | 整套 HudView（含 Text/Lite）一次抽出 |
| 任务结构 | Parent + 两 children |

## Task map

| 任务 | 目录 | 交付 |
|------|------|------|
| **Parent**（集成，不直接实现） | `09-20-website-wysiwyg-demo` | 需求权威源、跨子任务验收、集成评审 |
| Child ① | `09-21-shared-hud-view-package` | 共享 HUD 视图包 + App 接线回归 |
| Child ② | `09-21-website-live-hud-demo` | 官网极简单页 + DOM→HudChip 适配（**依赖** ① 先完成） |

## Requirements

### R1 — 首屏可玩预览

- 第一视口：品牌 + 短 tagline + **可交互 Full HUD demo**（主）+ 下载 CTA（次）。
- Live demo 取代截图 placeholder 作为主视觉。

### R2 — 复刻 Full HUD（仅事件源不同）

- 视觉与行为对齐 App Full：`KeyboardMap` + `MouseSchematic`，held-set 高亮 + scroll pulse。
- Website：DOM `keydown`/`keyup` + 鼠标按键 + 滚轮 → 与 App 相同的 `HudChip` / slots 语义（Web 可实现范围内）。
- 捕获范围 = 页面/demo 焦点内（非 OS 全局）；页上须有简短能力边界说明。

### R3 — 极简单页 IA

1. Hero：品牌 + tagline + Full live demo + 次要下载 CTA  
2. 能力边界：1–2 句「页面内预览 ≠ App 全局捕获 / 录屏 HUD」  
3. Downloads：沿用 `latest.json` / `/downloads/`  
4. Version：版本号 + Changelog；manifest 入口可弱化  

本期不做：三档切换 UI、营销长页、多页文档站、多语言站点结构、品牌视觉定稿。

### R4 — 共享视图层

- pnpm workspace 新增共享包；含整套 HUD 视图（`HudView` + Text/Lite/Full 依赖）。
- 禁止官网另写「长得像」的键盘 UI。
- App 抽出后 overlay 三档 HUD 行为不回归。
- 纯视图/chip 类型与 Tauri `invoke`/`listen` 分离；共享包不依赖 `@tauri-apps/*`。

### R5 — 交付与回归

- Child ① + ② 完成后 parent 集成验收通过。
- 既有 `site:sync-web` / `site:serve` / 下载与 updater 壳路径不破坏。

## Out of scope

- 官网视觉定稿、三档预设切换、营销/FAQ/文档站
- 浏览器全局捕获、权限引导、托盘、overlay 置顶、涟漪、自定义光标
- 公网域名 / 生产 updater 密钥 / Cloudflare
- 改变 Gitee Release 手动流程

## Follow-ups

- 官网 demo 预设切换 Text/Lite/Full
- 官网视觉定稿
- 加长单页 / 多页文档（若需要）

## Acceptance Criteria

- [x] **AC1** Child ①：App overlay Text/Lite/Full 仍正常；HUD 视图来自共享包；共享包无 Tauri 依赖
- [x] **AC2** Child ②：官网首屏可玩 Full demo（键+鼠+滚轮）；能力边界文案可见；下载/版本仍可用
- [x] **AC3** 集成：两端 HUD 视觉同源；唯一产品差异为事件源（原生 hook vs DOM）；无第二套键盘 UI
- [x] **AC4** `pnpm website:build` + `pnpm site:sync-web` 仍可产出可服务的 `website/publish/` 页面

## Technical Notes

- 详见 parent `design.md`；执行拆分见 parent `implement.md` 与各 child 产物。
- `cast.ts` / `settings.ts` 现含 `@tauri-apps`：抽出时必须拆纯类型/格式化 vs IPC。
