# HUD settings morphotype schematics

## Goal

设置 HUD 面板里，用静态形态缩略图替换文字分段/下拉，让用户看图知意选择 `hudPreset` 与 `keyMouseLayout`。

## Locked decisions (grilling)

| 项 | 选择 |
|----|------|
| 预设控件 | **A**：1×3 图卡替换 `SegmentedControl` |
| 预设图内容 | 形态缩略图（Text=字条；Lite=键帽+小鼠标；Full=键盘轮廓+鼠标），非「Ctrl+Space」通用文案图 |
| 键鼠布局 | 1×4 构图卡替换 `<select>`（阅读方向优先于 2×2） |
| 键鼠图内容 | 长方形=键盘，椭圆+竖线=鼠标；相对位置即布局 |
| 标签 | 图卡下方**可见**小字（i18n 现有文案） |
| 图实现 | **死图**（SVG/CSS）；不跟 HUD 主题色活预览；不复用真实 `KeyCard`/`KeyboardMap` 缩小件 |

## Requirements

- R1. `HudPanel`：`hudPreset` 用三张可选图卡；选中态清晰；键盘可达（role/radiogroup 或等价）
- R2. `HudPanel`：`keyMouseLayout` 用四张可选图卡（现有四个枚举值不变）
- R3. 持久化合同不变：仍写 `hudPreset` / `keyMouseLayout`；无新设置字段
- R4. 可见标签走 `$lib/i18n`（中英）
- R5. 示意仅为设置页装饰控件；不改变 overlay 渲染

## Out of scope

- Overlay 预览窗、活预览跟主题
- 改预设语义或新增预设
- 小键盘 / 滚轮 / Text 队列

## Acceptance Criteria

- [ ] AC1: 无文字分段条选预设；三图卡切换与今日预设行为一致
- [ ] AC2: 无布局下拉；四图卡切换四种 `keyMouseLayout`，overlay 排列立即跟随
- [ ] AC3: 中英标签可见；选中态可辨
- [ ] AC4: 图为静态示意，不依赖当前 HUD 颜色设置

## Complexity

Lightweight–medium：PRD 可驱动；若组件拆分较大可补短 `design.md`。
