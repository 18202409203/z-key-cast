# Implement: Windows click ripple

## Checklist

1. **Emit path** — `input/windows.rs`：鼠标 L/R/M **down** 读 `pt` → 主屏局部 CSS px → `cast://mouse-ripple`；去掉「No mouse-ripple emit」注释。
2. **Coord helper** — 纯函数（可同文件或小模块）：physical screen pt + primary origin/size/scale → `Option<(x,y)>`；越界 `None`。
3. **Tests（可选但推荐）** — 映射单测：主屏内点、越界、scale=1.25/1.5、负 origin。
4. **Docs** — `design/index.md`：一期含 Win 涟漪；二期去掉「Windows/Linux 涟漪」中的 Windows（保留 Linux）。
5. **README** — en/zh「点击涟漪」改为 macOS / Windows 主屏。
6. **Spec** — `cast-events.md` / `tauri/index.md`：删除「Win 不 emit」；写明 Win 已 emit、Linux 未做。
7. **Validate（agent）** — `cargo test`；不强制 Windows 真机。真机清单留给负责人。

## Validation

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

负责人真机（非 agent AC）：涟漪 on → 主屏环；`captureMouse` off 仍有环；外接屏无环；缩放档位点位大致对齐。

## Risks / rollback

| Risk | Rollback |
|------|----------|
| 仅 Win 文件 + docs | `git revert` 本任务提交即可；不影响 macOS |

## Before `task.py start`

- [x] PRD converged
- [x] design.md + implement.md
- [x] implement.jsonl / check.jsonl 已填真实条目
- [ ] 用户批准规划 → `task.py start`
