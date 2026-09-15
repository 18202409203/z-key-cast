# UI language Chinese/English

## Goal

设置与主要 UI 文案支持中英切换；键展示保持语言无关。

## Ordering

- After `09-15-drag-hud-position`；roadmap #10；不阻塞录屏 HUD 展示逻辑。

## Confirmed from codebase

- 无现成 i18n 库；主窗口 `+page.svelte` 大量英文硬编码；overlay 状态句较少
- 无系统托盘菜单
- `HudChip.id` / `label` 为稳定逻辑名与符号优先展示，与 UI 语言解耦

## Decisions (locked)

| 项 | 选择 |
|----|------|
| 翻译范围 | **主窗口 + overlay 状态句**（不含日志摘要） |
| 语言切换入口 | **Settings 内中/英选择**（持久化） |
| 默认语言 | **跟系统**：无已存设置时，中文族 locale → zh，否则 en |
| 键展示 | **语言无关**：不改 `HudChip.id` / `label`；不随 UI 语言翻译键帽文案 |
| 实现 | **手写字典**（`en`/`zh` message map + `t(key)`）；不引入 i18n 框架 |

## Requirements

- **R1** UI 语言：`en` / `zh`；Settings 提供语言选择
- **R2** 键 cap 保持语言无关（符号/现有短 label 不动）
- **R3** 语言选择持久化；切换后主窗口与 overlay 状态文案立即更新
- **R4** 翻译覆盖：Settings / Log / About 与表单；overlay hook/status 等用户可见状态句
- **R5** 无持久化语言时按系统 locale 推断；用户选定后不再跟系统变

## Out of scope

- 完整本地化平台；第三语言
- 翻译 `HudChip.label` / 键 id
- Log 行 / `summarizeHudChip` 随语言

## Acceptance Criteria

- [ ] Settings 可切换中/英并持久化
- [ ] 首次无设置时跟系统 locale 选中/英
- [ ] 切换后主窗口与 overlay 状态句更新
- [ ] `HudChip.id` / `label` 不随语言变化
