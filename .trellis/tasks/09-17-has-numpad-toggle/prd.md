# Optional numpad on Full keyboard map

## Goal

用捕获区「有无小键盘」声明控制 Full（及 Capture 共享）`KeyboardMap` 是否绘制小键盘列，让无小键盘笔记本更紧凑。

## Locked decisions (grilling)

| 项 | 选择 |
|----|------|
| 放置 | **捕获**面板（硬件声明），非 Full 条件 HUD 控件 |
| 文案语义 | 「有小键盘」类硬件表述 |
| 默认 | **开**（外接全键盘友好） |
| 效果范围 | 只改板形：Capture 共享板 + Full overlay |
| 与忽略 | **分离**；不自动改 `ignoredKeyIds` / Numpad 忽略分类 |
| 错配 | 用户关小键盘仍按下 `Numpad*` → **照常捕获**（方案 A）；Full 上无键可亮 |
| 自动检测 | **本期不做** |

## Requirements

- R1. 新增持久设置（如 `hasNumpad: bool`，默认 `true`），放在 Capture 设置合同
- R2. `KeyboardMap`（overlay Full + Capture 忽略键板）在 `hasNumpad === false` 时不渲染小键盘列，主区收紧
- R3. 开关不改变键捕获/忽略逻辑；Numpad 事件仍可进 chip / Text·Lite 文案
- R4. i18n 中英

## Out of scope

- HID/系统自动探测键盘类型
- 关小键盘时自动忽略 Numpad
- 错配 toast「检测到小键盘」
- Text 队列 / 滚轮 / 设置图卡

## Acceptance Criteria

- [ ] AC1: 捕获区可开关；默认开；重启后保持
- [ ] AC2: 关时 Full 与 Capture 板均无小键盘列且更紧凑
- [ ] AC3: 关时按下 Numpad 键仍发射（未另忽略时）；Full 无对应高亮
- [ ] AC4: 忽略分类「Numpad」行为与本开关无关

## Complexity

Medium：需 `design.md`（设置字段 + `KeyboardMap` 收缩）再 `task.py start`。
