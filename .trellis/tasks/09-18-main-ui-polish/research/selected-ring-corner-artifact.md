# 选中态蓝色描边在圆角处"发灰/和底图重叠"的成因 + 修复后复测

调研对象：`src/lib/components/ChoiceCardGroup.svelte` 的 `layout="fill"` 分支
（Appearance → 窗口外观，`appearance-system / -dark / -light` 三张全出血示意图）。

## 现象

选中项在 `border-radius` 的弯角处，蓝色描边被稀释成灰蓝色，看起来像"描边压在底图上、颜色不纯"。
直角边上没有这个问题。

## 修复前实现（baseline）

```css
.choice-card--fill .schematic-frame {
  border-radius: var(--radius-md);   /* 10px */
  border: 2px solid var(--app-control-border);
  overflow: hidden;                  /* 裁剪全出血 SVG */
  background: var(--app-inset);
}
.choice-card--fill:has(input:checked) .schematic-frame {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 1px var(--app-accent);   /* ← 关键 */
}
```

即选中态 = **2px accent 边框 + 1px accent 外发光 = 3px 视觉环**（未选中只有 2px，选中态还会显得更"厚"）。

## 初步实测证据（修复前）

用同一份 CSS 结构做成最小复现页，Chrome headless 以真实 2x 设备像素渲染，
沿"角心"取放射状剖面（单位：device px，2x 下 1 css px = 2 device px）：

| 方向 | 内 1px | 实心 accent | 外 2px |
|---|---|---|---|
| 0°/90°（直边） | – | `#007aff` × 6 | – |
| 45°（左上圆角） | `(67,156,254)` 淡 | `#007aff` × 4 | `(108,178,255)` × 2 |

- 直边：6 个连续 device px 是**纯** `#007aff`（2px 边框 + 1px 外发光 = 3 css px），两侧硬切换。
- 圆角 45°：纯色只剩 4 px；内侧 1 px 混成 `(67,156,254)`，外侧 2 px 混成 `(108,178,255)`。

## 结论（两个叠加成因，都在圆角处才显性）

### 成因 1（主因）：多出来的一层 1px `box-shadow`

`box-shadow: 0 0 0 1px` 在圆角处形成一条**半径 11px、宽仅 1px 的弧线**。
1px 宽的曲线无法落在像素栅格上，几乎整条都是抗锯齿覆盖度 < 100% 的像素 →
渲染出来是 `(108,178,255)` 这种"半透明淡蓝"，而不是 `#007aff`。
直边因为和像素栅格对齐，1px 能拿到 2 个 100% 覆盖的 device px，所以看不出问题。
这正是"**只有 border-radius 的时候**颜色不纯"的原因。

### 成因 2（次因）：2px 边框内弧的抗锯齿直接压在底图上

`overflow: hidden` 把全出血 SVG 裁到 padding box（半径 10−2 = 8px），
边框内弧与裁剪弧是同一条曲线，两者的抗锯齿像素落在同一批像素上 →
描边最内侧 1px 与底图像素混合（白底测得 `(67,156,254)`；暗底 `#1c1c1e` 会混成偏灰的蓝）。
这就是"描边和底图有点重叠"的观感来源。

> 排除项：不是 `--app-accent-soft` 半透明色的问题（fill 布局下卡片背景是 `transparent`，
> 底图下面是 `--app-inset`，不含 accent 色浆）；也不是 `--app-accent` 本身带 alpha（`@property` 声明为
> `#0a84ff` / `#007aff` 纯色）。

## 可选修法

| 方案 | 做法 | 优点 | 代价 |
|---|---|---|---|
| A | 删掉 `box-shadow: 0 0 0 1px`，选中态只保留 2px accent 边框 | 改动最小；和未选中态的 2px 网格一致，不再变厚 | 成因 2 仍在（内弧仍有 1px 与底图混色），但可接受 |
| B | 描边挪到外侧留缝：`outline: 2px solid var(--app-accent); outline-offset: 2px`，边框保持中性色 | 描边完全脱离底图，抗锯齿只和白/页面背景合成，颜色最纯；是 macOS 外观选择器的做法 | 视觉占位 +4px（8px 列间距下勉强够），设计观感变化最大 |
| C | 环内留 1–2px 实底：让底图缩小，accent 内弧压在与底图无关的实色上 | 保留"环包图"的现有观感，成因 1、2 都消除 | 示意底图略微缩小 |

采用 **A + C**（见下）。

## 已落地修复（`src/lib/components/ChoiceCardGroup.svelte`）

```css
/* A：去掉多余的一层 1px 外发光 */
.choice-card--fill:has(input:checked) .schematic-frame {
  border-color: var(--app-accent);
}

/* C：环内留 1px 实底。
   注意：只给 frame 加 `padding: 1px` 不能消除成因 2 —— frame 的 `overflow: hidden`
   会把底图裁在 padding box 上（半径 8px），底图的方角依旧正好压在边框内弧上。
   因此在 `.schematic` 上用 1px 透明边框 + 自绘圆角 + 自己裁切：
   透明边框那一圈露出 frame 的 `--app-inset` 实底，底图再向内缩 1px 且自带半径 7px 圆角。 */
.choice-card--fill .schematic {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid transparent;
  border-radius: calc(var(--radius-md) - 2px);
  overflow: hidden;
}
```

几何（frame 是 content-box：`width: 100%; max-width: 96px; aspect-ratio: 4 / 3`）：

- frame 边框盒 **100×76**、内容盒 96×72 —— **选中/未选中完全一致**（`getBoundingClientRect` 实测）；
- `.schematic` 边框盒 96×72（`box-sizing: border-box`）→ 内容盒 94×70，圆角 8px，把底图裁到半径 7px；
- 因此环（2 css px = 4 device px）与底图之间恒有 **1 css px = 2 device px** 的 `--app-inset` 实缝，
  而且这条缝是直线/圆弧同心的，不再是"描边内弧 = 底图裁剪弧"。

## 修复后复测（R4 / AC5 证据：浅色 + 深色）

```bash
# 1) 参数化复现页：浅色 + 深色 token / 深色底图，每个外观 6 个变体
#    ref   = 理想 2px accent 环（同几何、无底图）→ 角部 AA 的"理论下限"参照物
#    old   = 修复前（2px 边框 + 1px 外发光 + 底图直抵内弧）
#    new   = 修复后（单 2px 环 + 1px --app-inset 实缝 + 底图缩进）
#    unsel = 未选中（中性 2px 环 + 同一条实缝）
#    half  = 修复后 + 0.33 css px 亚像素偏移（模拟分数列宽，如真实面板 ~150px 列）
#    disabled = 修复后 + `opacity: .55`（对应 `.choice-card:has(input:disabled)`）
# 2) 2x 设备像素探针：PNG 无依赖解码（zlib），取弧心等距环带 + 0/42/45/48/90° 放射剖面
node .trellis/tasks/09-18-main-ui-polish/research/ring-probe.mjs
```

> 复现页：`research/selected-ring-repro.html`；探针脚本：`research/ring-probe.mjs`
> （渲染命令：`--headless=new --force-device-scale-factor=2 --window-size=900,500`，
> 截图 1800×1000，即真实 2x 设备像素；几何用 `--dump-dom` 里的 `#geo` 校对）。
> 采集当次完整输出：`research/selected-ring-probe-output.txt`。

### 1. 直边（四条边都测；下表以左边为例，|off| 为距最近弧心的距离）

`A` = 纯 accent，`n/i/g/a` = 纯中性边框/`--app-inset`/页面底/底图。
四条直边（left/right/top/bottom）的"纯色 run"完全一致：`old` = **6 px**，`new` / `ref` / `unsel` = **4 px**
（`unsel` 走中性色 `#d1d1d6` / `#48484a`）；`half`（亚像素偏移）仍是 **4 px**，只是整体平移
（|off| 16.2..19.2 或 16.8..19.8）—— 说明 Chrome 会把直边吸附到设备像素栅格。

| 变体 | 直边剖面（由外向内） | 环宽 |
|---|---|---|
| 浅色 old | `#ffffff` … `#007aff`×**6** (-21.5…-16.5) … `#ffffff`（底图直抵内弧） | 6 device px（比边框盒外扩 1 css px） |
| 浅色 new | `#ffffff` … `#007aff`×**4** (-19.5…-16.5) … `#f2f2f7`×2 (-15.5,-14.5) … `#ffffff` | **4 device px，外侧与边框盒齐平** |
| 浅色 unsel | `#ffffff` … `#d1d1d6`×**4** … `#f2f2f7`×2 … `#ffffff` | 4 device px（与选中态同宽同位置） |
| 深色 old | `#1c1c1e` … `#0a84ff`×**6** … `#1c1c1e` | 6 device px |
| 深色 new | `#1c1c1e` … `#0a84ff`×**4** … `#2c2c2e`×2 … `#1c1c1e` | **4 device px** |
| 深色 unsel | `#1c1c1e` … `#48484a`×**4** … `#2c2c2e`×2 … `#1c1c1e` | 4 device px |
| 浅色 disabled (.55) | `#ffffff` … `#72b5ff`×**4** … `#f7f7fa`×2 … `#ffffff` | 4 device px（0.55 合成：`0.55*#007aff + 0.45*#ffffff`） |

直边两侧都是硬切换（相邻像素直接是纯 `--app-bg` / 纯 `--app-inset`），无中间过渡像素。

### 2. 四个圆角（弧心等距环带统计，d 为设备像素；band = 16…20）

| 变体 | 画出的环 `d(α≥10%)` | 实心 accent `d(α≥97%)` | 角上"洗白"像素<br>`d>20.5` 且覆盖 25–90% |
|---|---|---|---|
| 浅色 ref（理想环，无底图） | 15.6…20.4（135 px） | 16.4…19.6（88 px） | **0** |
| 浅色 old（修复前） | 15.9…**22.3**（195 px） | 16.4…**21.5**（148 px） | **21–22 px**（25–83% 覆盖，d≈21.5–22.2） |
| 浅色 new（修复后） | 15.6…20.4（135 px） | 16.4…19.6（88 px） | **0** |
| 深色 ref | 15.6…20.4（135 px） | 16.4…19.6（87 px） | 0 |
| 深色 old | 15.9…**22.3**（195 px） | 16.4…**21.3**（147 px） | **19–22 px**（25–90% 覆盖） |
| 深色 new | 15.6…20.4（135 px） | 16.4…19.6（87 px） | **0** |
| 浅色 new·half（亚像素偏移） | 15.2…20.7 | 16.2…19.8 | 0（仅 1 px `d20.5@29%`） |
| 深色 new·half | 15.2…20.7 | 16.2…19.8 | 0（仅 1 px `d20.5@29%`） |
| 浅色/深色 unsel | 无 accent 像素（中性 4px 环 + 2px 实缝） | – | 0 |
| 浅色/深色 disabled (.55) | 15.4…20.4 | 16.4…19.6 | 0 |

`new` 与 `ref` 的四个角在浅色/深色下都是**逐像素一致**（环带宽度、实心核心、画出的外沿、
以及全部 25–90% 过渡像素的位置与覆盖度）；`old` 则是 d 到 22.3、实心核心到 21.5 的一圈明显外扩 —— 即"1px 外发光弧"。

### 3. 原始 RGB 序列（左上圆角逐像素；`<nn>` = accent 覆盖率，`[x]` = 判定）

浅色 old（修复前）：

```
0°  (448,116)  13.5:#ffffff 14.5:#ffffff 15.5:#ffffff 16.5:#007aff 17.5:#007aff 18.5:#007aff 19.5:#007aff 20.5:#007aff 21.5:#007aff 22.5:#ffffff
42° (448,116)  14.2:#ffffff 15.6:#f9fbfe 16.3:#238bff<0.86> 17.0:#007aff 17.7:#007aff 18.4:#007aff 19.1:#007aff 19.8:#0079ff 20.6:#007aff 21.2:#007aff 22.0:#97c9ff<0.42>
45° (448,116)  14.8:#ffffff 16.3:#439cfe<0.74> 17.7:#007aff 19.1:#007aff 20.5:#007aff 21.9:#6cb2ff<0.58>
48° (448,116)  14.2:#ffffff 15.6:#f8fbfe 16.3:#1b87ff<0.83> 17.0:#007aff … 19.8:#007aff 20.6:#007aff 21.2:#007aff 22.0:#93c6ff<0.39>
90° (448,116)  13.5:#ffffff 14.5:#ffffff 15.5:#ffffff 16.5:#007aff … 21.5:#007aff 22.5:#ffffff
```

浅色 new（修复后）：

```
0°  (784,116)  13.5:#ffffff 14.5:#f2f2f7 15.5:#f2f2f7 16.5:#007aff 17.5:#007aff 18.5:#007aff 19.5:#007aff 20.5:#ffffff 21.5:#ffffff 22.5:#ffffff
42° (784,116)  14.2:#f6f6f9 15.6:#d3e3f8<0.13> 16.3:#1081fe<0.86> 17.0:#007aff 17.7:#007aff 18.4:#007aff 19.1:#007aff 19.8:#409bff<0.71> 20.6:#ffffff 21.2:#ffffff 22.0:#ffffff
45° (784,116)  14.8:#f2f2f7 16.3:#228bfe<0.86> 17.7:#007aff 19.1:#007aff 20.5:#eff7ff<0.06>
48° (784,116)  14.2:#f6f6fa 15.6:#d0e1f8<0.13> 16.3:#0d80fe<0.91> 17.0:#007aff 17.7:#007aff 18.4:#007aff 19.1:#007aff 19.8:#3a98ff<0.71> 20.6:#ffffff 21.2:#ffffff 22.0:#ffffff
90° (784,116)  13.5:#ffffff 14.5:#f2f2f7 15.5:#f2f2f7 16.5:#007aff 17.5:#007aff 18.5:#007aff 19.5:#007aff 20.5:#ffffff 21.5:#ffffff 22.5:#ffffff
```

深色 old（修复前）：

```
0°  (784,452)  13.5:#1c1c1e 14.5:#1c1c1e 15.5:#1c1c1e 16.5:#0a84ff 17.5:#0a84ff 18.5:#0a84ff 19.5:#0a84ff 20.5:#0a84ff 21.5:#0a84ff 22.5:#1c1c1e
42° (784,452)  14.2:#1c1c1e 15.6:#1c1f23 16.3:#0d76e0<0.85> 17.0:#0a84ff … 19.8:#0984ff 20.6:#0a84ff 21.2:#0a84ff 22.0:#144679<0.39>
45° (784,452)  14.8:#1c1c1e 16.3:#0f68c3<0.73> 17.7:#0a84ff 19.1:#0a84ff 20.5:#0983ff 21.9:#10579f<0.57>
```

深色 new（修复后）：

```
0°  (1120,452) 13.5:#1c1c1e 14.5:#2c2c2e 15.5:#2c2c2e 16.5:#0a84ff 17.5:#0a84ff 18.5:#0a84ff 19.5:#0a84ff 20.5:#1c1c1e 21.5:#1c1c1e 22.5:#1c1c1e
42° (1120,452) 14.2:#262628 15.6:#273748<0.12> 16.3:#0c7ef1<0.86> 17.0:#0a84ff 17.7:#0a84ff 18.4:#0a84ff 19.1:#0a84ff 19.8:#0e6ac6<0.71> 20.6:#1c1c1e 21.2:#1c1c1e 22.0:#1c1c1e
45° (1120,452) 14.8:#2c2c2e 16.3:#0e77e2<0.86> 17.7:#0a84ff 19.1:#0a84ff 20.5:#1a222c<0.06> 21.9:#1c1c1e
48° (1120,452) 14.2:#262628 15.6:#26374a<0.13> 16.3:#0b7ff3<0.87> 17.0:#0a84ff … 19.8:#0d6ccb<0.71> 20.6:#1c1c1e 21.2:#1c1c1e 22.0:#1c1c1e
90° (1120,452) 13.5:#1c1c1e 14.5:#2c2c2e 15.5:#2c2c2e 16.5:#0a84ff 17.5:#0a84ff 18.5:#0a84ff 19.5:#0a84ff 20.5:#1c1c1e 21.5:#1c1c1e 22.5:#1c1c1e
```

### 4. AC5 判定

| AC5 条款 | 实测 | 结论 |
|---|---|---|
| 直边上 accent 环 = 4 device px 纯色、硬切换 | 浅/深 均 `α≥0.97` × 4（d 16.4…19.6），两侧相邻像素分别是纯 `--app-bg` 与纯 `--app-inset` | ✅ |
| 圆角处不得出现"淡蓝洗白"fringe | 修复前每角 19–22 个 `d>20.5`、覆盖 25–90% 的像素（d 到 22.3，即 1px 外发光弧）；修复后 **0 个**，且四角与"理想 2px 环"参照逐像素一致 | ✅ |
| 选中不得加厚（与未选中同外框） | 选中 4 device px @ d 16.4…19.6 = 未选中 4 device px @ 同位置；`getBoundingClientRect` 两者都是 100×76 css | ✅ |
| 内弧不再与底图合成 | 底图再向内缩 1 css px（半径 7px 裁切），环与底图之间是 2 device px `--app-inset` 实缝；最内圈像素为 accent 与 `--app-inset` 的混合（浅 `#228bfe`=86%，深 `#0e77e2`=86%），不再是 accent 与底图混合 | ✅ |

### 5. 残留（可接受）与真实缺陷

- **可接受**：圆角处每侧环沿仍有 1 个抗锯齿像素（内沿 85–91% / 13% accent，外沿 71% / 6%）。
  这是 2px 圆角边框在 2x 栅格上的固有现象：`ref`（同几何、无底图、无外发光的理想环）测得的
  数值完全相同，因此不构成"多加的一层淡色"。它只出现在环带两侧各 1 px，视觉上仍是干净的单色环。
- **可接受**：`half`（亚像素偏移）下画出的环外沿会在 20.17…20.70 之间抖动（±0.3 px），
  偶发多出 1 个 29% 覆盖像素；直边仍被 Chrome 吸附到设备像素栅格（4 px 纯色不变）。
- **非缺陷**：`dark` 变体环带内 d=13.8…14.6 处有 1–4 个"无法用 token 解释"的像素，
  那是深色底图自身圆角面板的抗锯齿（`appearance-dark` 底图在 `xMidYMid slice` 下的
  面板圆角落在角部），与描边无关；`ref`（无底图）处为 0。

## 复现/验证命令

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE=".trellis/tasks/09-18-main-ui-polish/research/selected-ring-repro.html"

# 单张 2x 截图（浅色 + 深色全部变体都在这一页里）
"$CHROME" --headless=new --disable-gpu --force-device-scale-factor=2 --hide-scrollbars \
  --screenshot=/tmp/ring-2x.png --window-size=900,500 "file://$PWD/$PAGE"

# 全量像素判定（几何 + 直边 + 四角环带 + 原始 RGB 序列 + 与理想环对比）
node .trellis/tasks/09-18-main-ui-polish/research/ring-probe.mjs
```

注意：Chrome 用 8x 渲染时抗锯齿占比被摊薄，看着很干净；**必须用 2x（真实 Retina 设备像素）
或与 Tauri 的 WKWebView 等价的缩放** 才能复现观感。深色 token 必须单独跑一遍：
修复前的淡蓝 fringe 在深色下是偏灰的 `#10579f`，浅色下是 `#6cb2ff`，都不能只看一种外观。
