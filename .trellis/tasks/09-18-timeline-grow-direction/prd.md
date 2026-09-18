# Text/Lite 时间线出字方向（纠偏）

## Goal

去掉鸡肋的 `timelineGrow` 选项；Text/Lite 时间线固定 LTR「右入左移」；条带落点仍跟内容角。左角语义：角 = 行首/旧端，新键往屏心（右）长。

## Research notes（竞品）

KeyCastr / Screenkey / KeyCaster.spoon / Keyviz：追加方向固定 LTR（新在右），只调位置；不按角落水平镜像生长。

## Locked decisions

- **删除** `timelineGrow`（TS/Rust/i18n/HudPanel/UI）；旧配置字段忽略。
- 时间线 **固定右入左移**（新在右，旧往左挤）；**不**随 bl/tl 镜像。
- **贴右**：角 = 最新（live edge）。
- **贴左**：角 = 行首/旧端；新键在条带右端出现、往中间长；条内 LTR = 旧→新。
- 垂直贴边与 Full 键鼠贴角仍由 `contentCorner` 负责。
- 动画四角同一套「在条带右端出现」，无左入。

## Requirements

1. 移除 `timelineGrow` 全链路；normalize/deserialize 忽略未知或遗留字段。
2. HudView：去掉 `timeline-from-left` / corner 水平镜像生长；timeline 始终 row + 右端入场。
3. 条带水平落点仍跟 `hud-anchor-*`（左角左齐、右角右齐）；去掉「跟 grow 走的 align-self」特例若与角冲突则改回跟角。
4. 更新 spec（cast-events / type-safety）与本任务 design/implement。

## Out of scope

- Full 布局；custom 内容角（方案 C）；RTL 语言包。

## Acceptance Criteria

- [ ] 无 `timelineGrow` 设置项；旧 JSON 含该字段不报错。
- [ ] 任意角：新 chip 在条带右侧出现，旧的左移；无左入镜像。
- [ ] 左角条带贴左（旧在角、新往右）；右角条带贴右（新在角）。
- [ ] Full / 内容角垂直与键鼠贴边行为不回退。
