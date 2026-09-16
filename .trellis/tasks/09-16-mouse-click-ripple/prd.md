# Mouse click ripple (separate layer)

## Goal

录屏时在主屏点击位置弹出一圈淡色圆环，让观众看清点了哪里。独立全屏层承载；默认关；与 HUD 鼠标监听**解耦**。

## Background

- `design/index.md` 将「点击涟漪」标为二期；HUD 约定目前写「不做光标涟漪」（本任务交付后需改文档）。
- 现有 `overlay` 为 `760×320` 透明置顶点击穿透小窗；`HudChip::Mouse` / `RawInput::Mouse` 仅有按键、无坐标。
- macOS `CGEventTap` 已捕获鼠标 down/up；非 macOS 为 stub。

## Decisions

| Topic | Choice |
|-------|--------|
| Window | 独立主屏全屏透明窗（label 如 `ripple`）；不改 HUD `overlay` 尺寸 |
| Default | 涟漪 off；缺字段 → off |
| Cursor indicator / trail | 不做 |
| Multi-monitor | 仅主屏；外接屏不播 |
| Platform | **本任务仅 macOS 交付**；Windows 涟漪另开任务（待 Windows 输入钩子就绪后再接同一 channel） |
| Coupling | **三同级开关**：`captureKeyboard` / `captureMouse`（HUD+日志鼠 chip）/ `mouseClickRipple`；鼠 HUD 与涟漪互不门控 |
| Settings UI | 三个开关同级展示；涟漪放在「鼠标监听」正下方（仅排序）；默认关、始终可见 |
| Visual | 一期固定样式（淡色 expand + fade）；无可配色/大小/时长 |
| Event contract | **不改** `cast://event` / `HudChip`；另开 ripple 专用 channel |

## Requirements

### R1 — Ripple window

独立 webview：透明、always-on-top、skip taskbar、click-through、无装饰；几何贴齐**主屏**。有效关闭时不保持可见全屏层（hide 或 destroy，实现见 `design.md`）。

### R2 — Click ring

主屏上鼠标 **down**（左/右/中）在点击坐标播固定样式圆环。外接屏坐标丢弃。与角落鼠标 HUD 并行，互不替代。即使 `captureMouse` 关，只要涟漪开仍播环（钩子仍能收到鼠标 down；chip emit 仍可被 `allows_chip` 丢掉）。

### R3 — Settings

持久化增加 `mouseClickRipple: boolean`（可挂在 capture 块或独立字段；serde omit→false）。Settings：鼠标监听下方 checkbox，始终可见；en/zh。热更新：涟漪 on → 显层；off → 关层。与 `captureMouse` 无逻辑与。

### R4 — Event path

从钩子取屏幕坐标；仅 `mouseClickRipple` 开时向 ripple 窗 emit。禁止把坐标塞进 `HudChip`。

## Acceptance Criteria

- [x] AC1: 默认 / omit → 无可见 ripple 窗。(R1, R3)
- [x] AC2: 涟漪 on → 主屏 L/R/M down 出现淡出圆环（与 `captureMouse` 无关）。(R2)
- [x] AC3: 关监听、开涟漪 → 无鼠 chip / 日志鼠条，仍有环；HUD 小窗与 `HudChip` 合同不变。(Decisions, R4)
- [x] AC4: 开关持久化 + 中英；控件在鼠标监听下且始终可见。(R3)
- [x] AC5: 外接屏点击不播环；非 macOS 无回归（stub 行为保持）。(Decisions)

## Out of scope

- 位置指示器、轨迹拖尾、外接屏
- **Windows / Linux 涟漪**（另开任务；本任务 Settings 可出现开关，非 macOS 无效果或随 stub hook 不可用——实现时选一种并文档化，推荐：开关可开但无环，不阻塞）
- 可配样式、HUD 全屏化
- 实现 Windows 全局鼠标钩子本身
