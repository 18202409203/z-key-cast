# Implement — Custom content-corner picker

## Checklist

1. [ ] Rust `HudPositionSettings::Custom` 加 `content_corner`（serde default `Br`）；更新 `end_hud_place_mode` 接受并写入角（保留已有 Custom 角的路径要测）。
2. [ ] TS 类型 / `isHudPositionSettings` / `DEFAULT` / `contentCornerFromPosition`；单测或既有 guard 覆盖缺字段 → `br`。
3. [ ] `HudPanel`：draft + FormRow；Done 传入继承/所选角；已 custom 时变更即时 `setHudPositionSettings`。
4. [ ] `HudView`：移除 place affordance 节点/样式；确认 place 虚线框与 status 仍正常。
5. [ ] i18n：`settings.contentCorner`（en/zh）；清理无用 `overlay.placeAffordance`（若已无引用）。
6. [ ] Spec：`.trellis/spec/frontend/type-safety.md`、`tauri/cast-events.md`（custom → 存角，不再写死 br；place 横幅移除）；必要时 `design/03.md` 一句。
7. [ ] Validate：`pnpm check`；Rust settings 相关 `cargo test`（或项目惯用命令）。

## Validation

```bash
pnpm check
cd src-tauri && cargo test settings
```

（若 crate 测试模块路径不同，以仓库现有 settings tests 为准。）

## Risk / rollback

- `end_hud_place_mode` 签名变更：前后端同步改。
- 旧 custom JSON 必须仍能加载。
- Rollback：revert 本任务提交；无需数据迁移脚本（多字段可忽略）。

## Ready for start when

- User reviewed `prd.md` / `design.md` / `implement.md`
- `implement.jsonl` / `check.jsonl` curated（step 1.3）
- `task.py start`
