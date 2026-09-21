# Implement — 官网所见即所得（parent）

Parent **不直接改业务代码**。实现落在 children；本文件管顺序、集成门禁与回滚点。

## Order

1. **Child ①** `09-21-shared-hud-view-package`  
   - 抽共享包 → App 改依赖 → overlay 三档回归  
   - **门禁**：AC1（见 parent `prd.md`）通过后再开 ②  

2. **Child ②** `09-21-website-live-hud-demo`  
   - 依赖 ①：website 引用共享包 + DOM→HudChip + 极简单页  
   - **门禁**：AC2  

3. **Parent 集成评审**  
   - AC3 + AC4；对照 follow-ups 是否误进范围  

## Validation（集成）

```bash
pnpm check                    # App
pnpm website:check
pnpm website:build && pnpm site:sync-web
# 手动：App overlay Text/Lite/Full；浏览器打开 site 首屏试 Full demo + 下载链接
```

## Rollback points

| 点 | 动作 |
|----|------|
| 抽包中途 App 坏 | revert child ① 相关提交；website 不动 |
| 官网页坏、包完好 | revert child ②；保留共享包 |
| 集成失败 | 按 AC 定位属于 ① 或 ②，不在 parent 另开第三套 UI |

## Before `task.py start`

- [x] Parent `prd.md` 收敛  
- [x] Parent `design.md` / `implement.md`  
- [x] Children 已创建并写 PRD（+ 各自 design/implement）  
- [ ] 用户审阅规划并同意开始  
- [ ] 先 `task.py start 09-21-shared-hud-view-package`（**不要** start parent 做实现）  

## Notes

- 启动实现时只激活 **当前 child**；parent 保持 planning/集成角色直至两端完成。
