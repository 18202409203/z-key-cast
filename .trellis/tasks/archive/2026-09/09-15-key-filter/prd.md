# Key listen/ignore filter

## Goal

用户可按键忽略噪音键，并支持分类快速批量忽略，减少录屏噪音。

## Ordering

- After display modes per roadmap；depends on stable key `id`s.
- Filter runs in emit path（与现有 `allows_chip` 同层/之后），基于 `KeyRef.id`。

## Decisions (locked)

| 项 | 选择 |
|----|------|
| 过滤模型 | **仅忽略列表**（默认空 = 全听） |
| 批量忽略 | 七类分类预制 toggle → 展开为 `id[]` |
| MVP 分类 | Letters / Digits / Function / Arrows / Numpad / Navigation / Punctuation |
| 单键加入 | **按键捕获**（Add key） |
| 忽略语义 | 用户加入的任意 `id`（含修饰）一律按 R2；无豁免 |
| 取消捕获 | **仅 Cancel 按钮**；Esc 写入忽略列表 |
| UI 位置 | Capture section 内（键/鼠开关下方） |

### Category id coverage

| Category | ids |
|----------|-----|
| Letters | `KeyA`–`KeyZ` |
| Digits | `Digit0`–`Digit9`（顶行，不含小键盘） |
| Function | `F1`–`F12`（不含 F13–F20） |
| Arrows | `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown` |
| Numpad | `Numpad0`–`Numpad9` + Decimal / Multiply / Add / Divide / Subtract / Enter / Equal / NumLock |
| Navigation | `Home` / `End` / `PageUp` / `PageDown` / `ForwardDelete` |
| Punctuation | `Backquote` / `Minus` / `Equal` / `BracketLeft` / `BracketRight` / `Backslash` / `Semicolon` / `Quote` / `Comma` / `Period` / `Slash` |

未归入分类的键（Space / Tab / Enter / Escape / Backspace / Help / 修饰键 / F13–F20 等）仅能单键忽略。

## Requirements

- **R1** 持久化忽略列表：`ignoredKeyIds: string[]`
- **R2** emit 前统一过滤：主键 ∈ 列表 → 丢弃整条；`mods` 中命中 → 剥掉该修饰（可空 mods）；鼠标 chip 不受影响
- **R3** 不破坏「裸修饰不占条」
- **R4** 七类分类 toggle：整类 id 加入/移出；与单键共存；取消分类只移除该类成员
- **R5** 写入现有 `settings.json`（扩展 `CaptureSettings` / `AppSettings`）
- **R6** Add key 捕获：下一次按键 down（含修饰 FlagsChanged、含 Escape）的 `id` 写入列表；可单条移除
- **R7** 捕获用的那一次按键不出 HUD、不进日志
- **R8** 仅 Cancel 退出捕获；Esc 不取消

## Out of scope

- 允许列表；按应用过滤；鼠标按键级忽略；自定义分组；修饰豁免

## Acceptance Criteria

- [ ] 忽略主键后该键不出 chip（含 ⌘+该键）
- [ ] 忽略修饰后组合键 `mods` 不含该修饰；主键仍可显示
- [ ] 七类分类均可一键忽略/取消
- [ ] Add key 可加入任意键（含修饰、Escape）；可移除
- [ ] 捕获那一次不出 HUD / 不进日志
- [ ] 仅 Cancel 退出捕获
- [ ] 取消分类保留用户另加的其它忽略项
- [ ] 重启后设置仍生效
