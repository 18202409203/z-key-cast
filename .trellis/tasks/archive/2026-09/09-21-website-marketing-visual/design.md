# Design — Website marketing visual redesign

## Boundaries

| In | Out |
|----|-----|
| `website/` 单页视觉与英雄舞台 | App overlay / HudPanel / Tauri |
| 记事本 DOM + 空闲打字剧本 | 触控软键盘、伪 OS |
| 双表面 chip fan-out（Lite + Full 示意图） | 共享包大改 API（仅验收卡住时最小补丁） |
| 保留 downloads / latest.json 逻辑 | 公网 SEO、多语言引擎、色切换器 |

## Architecture

```
                    ┌─────────────────────────────┐
  real keyboard/    │  Notepad surface (focus)    │
  mouse/wheel  ────►│  text buffer + scroll       │
                    └──────────────┬──────────────┘
                                   │ DomInputAdapter
                                   ▼
                            HudChip stream
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                                         ▼
     createHudSlots (lite)                     createHudSlots (full)
     HudView Lite @ monitor corner             KeyboardMap + MouseSchematic
              │                                         │
              └──────────── monitor chrome ─────────────┘
                              + desk stage
```

**原则**：仍「只差事件源」；官网多一层记事本副作用与一次性剧本，不改 App。

## Data flow

1. **焦点**：记事本（或包住屏+台的 focus root）聚焦后，`attachDomInputAdapter` 产出 `HudChip`（复用现适配器合同）。
2. **Fan-out**：每个 chip → `liteSlots.showChip` + `fullSlots.showChip`（或等价 ingest）；两实例 `applyStyle` 分别为 `hudPreset: "lite"` + dark colors，与 `hudPreset: "full"`（下层只需 held 高亮，timeline 可不展示）。
3. **记事本**：
   - 剧本阶段：定时器按字符/键位发模拟 chip + 写入文本。
   - 用户阶段：`keydown` 可打印字符进 buffer；`Backspace` 删除；`wheel` 滚 `scrollTop` 且仍走 adapter 的 scroll chip；点击设置 caret（裁剪：可用 `textarea`/`contenteditable` 降复杂度）。
4. **剧本抢占**：任一真实 chip（或 focus 后首次真实 key/pointer）→ `cancelIntro()`；邀请文保留在 buffer 中，用户可继续编辑。

## Why dual slots

`createHudSlots` 在非 `full` 时清空 `activeKeyIds` / 鼠高亮。单实例无法同时驱动 Lite 时间线与 Full 键位图。双实例 fan-out **不改共享包**；若未来要单实例，再开任务给 `hud-slots` 暴露 held 投影。

## Visual reference

权威构图参考：`design/website/proto.png`。

实现目标：**神似**（布局、纸感、暗台、青强调、文案位置），非逐像素描图。屏内左上装饰控件用真 **Lite `HudView`** 替换，不复刻 proto 里示意小部件。

## Composition (UI)

- **页壳**：近黑 CSS 变量 + 可选微噪点；品牌与 tagline 在显示器上方居中（proto）。
- **显示器**：深色外框；屏内浅色可编辑面（无横线纸要求）；中心邀请句；角上 Lite（proto 示意在左上，实现可 `tl` 以贴参考，或以真 HUD 可读性为准）。
- **台下**：**初版 A** — `KeyboardMap` + `MouseSchematic` + 青激活/可选细线缆；proto 插画或 3D 不进本版。
- **底栏**：Download 主按钮 + 版本/桌面说明一句；可与 `#downloads` 合并为同区，避免双下载块。

## Contracts

- `HudChip` / DOM adapter 形状不变（`design/index.md` + 现 `dom-input-adapter.ts`）。
- 颜色：`HUD_COLOR_PRESETS` / `colorsFromHudPreset`；opacity 沿用默认。
- Vite：继续 `optimizeDeps.exclude` / `ssr.noExternal` 对 `z-key-cast-hud-view`。

## Trade-offs

| 选择 | 理由 | 代价 |
|------|------|------|
| 双 slots fan-out | 零共享包合同变更 | 双份状态机；须同步 clear/dispose |
| `textarea` 记事本 | 原生 caret/滚轮/退格 | 样式要压成「假窗口」；部分快捷键被浏览器吃掉（边界文案已覆盖类问题） |
| 一次性剧本非循环 | 符合 grill | 冷启动必须尽快开打字，否则首屏静默过久 |
| 不做手机 | 产品定位 | 窄屏可降级为简化布局或提示「请用电脑打开」，不验收触控玩法 |

## Compatibility / rollback

- 仅改 `website/`（必要时共享包最小导出已足够）。
- 回滚：恢复 `+page.svelte` 极简 Full demo；downloads 逻辑保持独立函数则易保留。
- `website/publish/` 同步流程不变。

## Open design notes

- 品牌字体具体 family（可自托管；避免 Inter）。
- 青色精确 hex 从 proto 取样定 CSS 变量即可。
- 后续：proto 键帽皮或 3D 键鼠（本版不做）。
