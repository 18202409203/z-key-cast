# 表单分区与标题层级统一

## Goal

设置侧 Settings / HUD / Capture 的分区与标题层级清晰、样式一致；Log 用同一壳做风格对齐；参考 macOS 系统设置：分组圆角浅底 + 标签/控件左右排布。

## Confirmed facts（代码）

- 主窗 Tab 字号 14px；曾出现 Section 16px / Label 14px 大于或持平 Tab，破坏导航→内容层级。
- About 为居中品牌文案，非表单。

## Locked decisions

- **不要 section 贯穿分割线**（避免与 Tab 横线打架）。
- **字号层级（相对 Tab）**：Tab（14px）≥ Section 标题（14px，靠字重/颜色区分）≥ Field label（13px）≥ sublabel / hint（12px）。不要求逐级严格递减，但下级不得大于上级。
- **字段默认左右布局**：label 左、控件右。
- **区块容器**：同一表单块浅灰圆角背景（grouped inset）。
- **标题相对灰底**：Section 标题在灰底**外面上方**；灰底内只有字段行。
- **宽控件例外**：`ChoiceCardGroup`、`KeyboardMap`、ignore 块等 → 灰底内整行堆叠。
- **组内行分隔**：灰底内极淡横线（仅组宽）；section 之间只靠间距。
- **适用范围**：Settings / HUD / Capture 完整 grouped form；**Log** 用同一 `FormSection` 壳（标题在外 + 灰底组 + 可选 header actions）对齐风格，内容仍为只读日志；About 保持品牌页。
- **Capture 导航**：保持单个 Capture 顶栏 Tab；页内 Mouse / Keyboard 两个 section。
- **Capture ignore**：不嵌套第二层灰底；整行堆叠 + 弱一级 sub-label。
- **Hint 位置（按布局类型）**：左右行 → label 下；整行堆叠 → 控件下；页级错误 → 组外顶部。

## Requirements

1. 共享 FormSection / FormRow；Settings / HUD / Capture 观感一致。
2. 每个 section：外置标题 + 圆角浅灰组；组内 L/R 或 stack；组内淡分隔。
3. 字号遵守 Tab ≥ Section ≥ Label ≥ sublabel/hint。
4. Log 使用 FormSection（含 clear actions）；不改为可编辑表单。
5. 不改变设置持久化 / 业务逻辑。

## Out of scope

- 拆分或新增顶栏 Tab。
- Capture 页内「鼠标｜键盘」二级分段。
- About 内容改版。
- Overlay / HUD corner 贴边（`09-17-hud-corner-anchor`）。

## Acceptance Criteria

- [ ] Settings、HUD、Capture：标题在外 + 圆角灰底 + L/R（宽控件 stack），样式同源。
- [ ] 字号：Tab ≥ Section ≥ Label ≥ sublabel/hint；无 section 贯穿分割线。
- [ ] 组内淡分隔；Hint 按行类型落位；capture failed 组外。
- [ ] Capture 单 Tab、两 section；ignore 无第二层灰底。
- [ ] Log 视觉对齐 FormSection 壳，仍为只读滚动日志。
- [ ] 设置保存/事件行为与改前一致。

## Notes

- 来源：`design/03.md`「表单分区优化」
- 姐妹任务：`09-17-hud-corner-anchor`
