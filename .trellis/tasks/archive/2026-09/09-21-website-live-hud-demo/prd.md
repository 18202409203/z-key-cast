# 官网极简单页 + Web 输入适配

## Goal

在 `website/` 落地极简单页：首屏 **可玩 Full HUD**（与 App 同源视图），DOM 键鼠滚轮驱动；保留下载与版本。能力边界文案说明「非全局捕获」。

## Ordering

- Parent：`09-20-website-wysiwyg-demo`
- **依赖** sibling `09-21-shared-hud-view-package` 完成（共享包可用且 App 已接线）

## Requirements

### R1 — 极简单页

- 区块：Hero（品牌 + tagline + Full live demo + 次要下载 CTA）→ 能力边界 1–2 句 → Downloads → Version。
- 不做：三档切换、营销长页、多页站、视觉定稿。

### R2 — Live Full demo

- 依赖共享包 `HudView` + `createHudSlots`；`isFull`；无 place mode。
- DOM：`keydown`/`keyup` + 鼠标按键 + 滚轮 → `HudChip` → slots（与 App 同合同）。
- 需合理处理焦点（如点击 demo 后监听）及 wheel 与页面滚动冲突（聚焦 demo 时再听 wheel / preventDefault 策略在 design 定）。

### R3 — 下载壳不回归

- 保留 `latest.json` / `/downloads/` 行为；`website:build` + `site:sync-web` 可用。

## Out of scope

- 抽共享包本身（sibling）
- 视觉定稿、预设切换、全局捕获、公网托管

## Acceptance Criteria

- [x] 首屏可对 Full 键盘/鼠标示意图做键+鼠+滚轮高亮/脉冲
- [x] 能力边界文案可见
- [x] 下载与版本区块仍可用（有/无 manifest 时降级行为不崩）
- [x] 无第二套手写键盘 UI；视图来自共享包
- [x] `pnpm website:check` 与 `pnpm website:build` 通过

## References

- Parent `prd.md` / `design.md`
- Sibling 共享包导出 API
