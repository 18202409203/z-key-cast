# 数字滑块组件与拖动数值

## Goal

设置里的数字滑块共用一个组件。拖动或键盘调节时，拇指上方出现当前值气泡；松手或按键提交后再保存，避免拖动过程中连续写设置。

## Confirmed facts

- 没有滑块组件。`$lib/components/` 只有 `Tabs`、`SegmentedControl`、`ChoiceCardGroup`、`FormSection`、`FormRow`。
- 全仓库仅 `src/lib/panels/HudPanel.svelte` 有三处 `<input type="range">`：字号、时间线条数、背景透明度。
- 停留时间是 `<input type="number">`，不是滑块。
- 行标签已带格式化数值：`settings.fontSize`「字号（{n}px）」、`settings.timelineMax`「时间线条数（{n}）」、`settings.bgOpacity`「背景透明度（{n}）」。数值来自已保存的 `hudStyle`。
- 三处都是 `onchange` → `patchHud` → `setHudStyleSettings`。`change` 在拖动松手时才触发，所以拖动中标签一直是旧值。
- 滑块宽度和 `accent-color` 来自 `FormRow` 对 `input[type="range"]` 的全局样式。

## Locked decisions

- 当前值用拇指上方的气泡显示，只在指针拖动或控件键盘聚焦时出现。
- 气泡文案与该行标签里的 `{n}` 相同（字号为整数 px 数、条数为整数、透明度为两位小数）。单位仍留在行标签里。
- 空闲时气泡消失，行标签继续显示已保存值。
- 拖动中的气泡不要求行标签同步变化；提交后标签与已保存值一致。

## Requirements

1. 抽出设置窗可复用的数字滑块，放在 `$lib/components/`，三处 range 都改用它。
2. 指针拖动和键盘步进时，拇指上方显示当前值，并随值变化更新。
3. 空闲时行标签仍显示已保存的数值，格式与现在的 i18n 字符串一致。
4. 拖动过程中不写设置；提交（松手，以及键盘步进触发的 `change`）后仍走现有 `patchHud` 与数值钳制。
5. 禁用态与现在一致：HUD 未就绪或位置拖放锁定时不可操作，且不出现气泡。
6. 保留现有 `aria-labelledby` / `aria-describedby`。

## Out of scope

- 把停留时间的数字框改成滑块。
- 网站营销页、HUD 叠层。
- 改变字号 / 条数 / 透明度的 min、max、step 或钳制规则。
- 拖动过程中把每次 `input` 都持久化。
- 滑块旁再放一个始终可见的数字。

## Acceptance Criteria

- [ ] 三处滑块来自 `$lib/components/` 的同一组件，不再各自写原生 range。
- [ ] 拖动时拇指上方出现当前值，数值跟着变化；松手后气泡消失。
- [ ] 键盘聚焦并用左右键调节时，同样显示并更新气泡。
- [ ] 未聚焦且未拖动时，只有行标签上的已保存值，没有气泡。
- [ ] 松手后标签数值与已保存设置一致；拖动途中没有连续保存。
- [ ] 字号、条数、透明度的范围、步长、禁用和保存结果与改前一致。
