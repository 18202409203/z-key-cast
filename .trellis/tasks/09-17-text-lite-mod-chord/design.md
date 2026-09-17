# Design: Text/Lite modifier chord commit

## Boundaries

| Layer | Change |
|-------|--------|
| Rust `HudChip` / `ChipReducer` | `Mouse`/`Scroll` 增加 `mods`；reduce 时克隆 `held_mods` |
| TS `cast.ts` | 类型、`isHudChip`、`formatHudLabel`、`formatHudChipLog`、`hudCards` |
| Overlay `hud-slots.svelte.ts` | Text/Lite：消费集 + 修饰 up 合成入队；取消「忽略全部裸修饰 down」；scroll 合并比 mods |
| `HudView.svelte` | Lite：mouse/scroll 行渲染 mods KeyCards + schematic |
| Spec / `design/index.md` | 废除裸修饰不占条；写明延迟提交 |

**非边界**：Full held-set 逻辑、scroll coalesce、捕获过滤、ignore list。

## Contracts

```ts
| { kind: "mouse"; mods: KeyRef[]; button; phase }
| { kind: "scroll"; mods: KeyRef[]; direction }
```

Rust 对称。`key` 不变。Bare/叠修饰展示仍走 `kind: "key"`（由消费者在未消费 up 时推入，`phase: "down"` 仅作展示相位；线上下游仍可能先到真实 `phase: "up"` — 消费者顺序：先处理 up 合成逻辑再决定是否入队）。

## Data flow (Text/Lite)

```
cast://event HudChip
  → showChip
       Full: 现逻辑（scroll 脉冲；key/mouse held-set；忽略 mods on mouse/scroll）
       Text/Lite:
         key + isModifier + down → 记录 pending（或不入队；held 以 chip 流为准只需 consumed Set）
         key + isModifier + up → 若 id ∉ consumed: push Key{ mods: otherHeldFromChip.mods, key, phase:down }; consume(key+mods); return
                              若 id ∈ consumed: drop; 可选从 consumed 清除该 id 以便下次按下
         key/mouse/scroll 伴随 → push（已带 mods）; consume all mod ids on chip; (mouse up 仍忽略)
         scroll 队尾同向且 sameModIds → refresh dwell only
```

**`consumed`**：`Set<string>` of modifier ids for the current down-cycle。修饰 down 时从 set 删除该 id（新一轮未消费）。伴随或叠修饰 up 合成入队时把相关 id 加入 set。

**otherHeld**：未消费修饰 up 时，线合同已是 `mods_excluding(self)` 在 ChipReducer 的 up 路径 — 直接用 chip.mods 即可（与 R1b 一致）。

## Trade-offs

| Choice | Why |
|--------|-----|
| 消费状态在前端 | Full/Log 仍收完整 down/up；避免 Rust 按 preset 分叉 |
| mouse/scroll 带 mods | 与 key 对称；唯一能表达 ⌘+滚轮 |
| 叠修饰在 up 合成 key chip | 复用 KeyCard / formatHudLabel；不必新 chip kind |

## Compatibility / rollback

- 前后端同发；无灰度。
- 回滚：恢复无 mods 的 mouse/scroll + 旧「忽略裸修饰」showChip；spec 回退。

## Rollout notes

- 手动冒烟：AC1–AC5 键盘+滚轮；Full 板面修饰高亮仍在 down 时出现（与时间线无关）。
