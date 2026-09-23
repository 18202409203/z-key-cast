/** Hand-rolled en/zh marketing copy (no i18n framework). */

export type UiLocale = "en" | "zh";

export type MessageKey = keyof typeof en;

const en = {
  "brand.tagline":
    "Lightweight keystroke overlay for streaming & recording.",
  "brand.features.aria": "Product highlights",
  "brand.feature.offline": "Runs offline",
  "brand.feature.offline.lead": "Full use, no connection",
  "brand.feature.size": "Under 3 MB",
  "brand.feature.size.lead": "Light install, little space",
  "brand.feature.oss": "100% Free",
  "brand.feature.oss.lead": "Open source, yours to use",

  "nav.aria": "Page sections",
  "nav.brand": "Brand",
  "nav.stage": "Demo",
  "nav.download": "Download",

  "lang.switch": "Language",
  "lang.en": "English",
  "lang.zh": "中文",

  "stage.aria": "Interactive keystroke demo — desktop keyboard and mouse",
  "stage.on": "On",
  "stage.off": "Off",
  "stage.power": "Power",
  "stage.blinds": "Blinds",
  "stage.blinds.open": "open (bright room)",
  "stage.blinds.closed": "closed (desk lamp on)",
  "stage.blinds.aria":
    "Blind cord — currently {state}. Click to switch room light.",
  "stage.help.aria": "How to use the demo",
  "stage.help":
    "Power button toggles the demo · pull the blind cord for room light.",

  "notepad.aria": "Demo notepad — type here",
  "intro.invite": "Press any key to take control.",

  "download.panel.title": "Get z-key-cast",
  "download.panel.lead": "Show your keystrokes, without the noise.",
  "download.panel.cta": "Download for macOS",
  "download.panel.platform": "Apple Silicon",
  "download.panel.quarantine":
    "If macOS says the app is damaged, move it to Applications and run",
  "download.panel.copy": "Copy command",
  "download.panel.copied": "Copied",

  /** Kept for future first-screen / Windows CTA reuse. */
  "cta.download": "Download",
  "cta.latest": "Latest: {version}",
  "cta.note": "Keyboard & mouse visualization.",

  "downloads.aria": "Downloads",
  "downloads.title": "Downloads",
  "downloads.windows.note": "Placeholder — updater C-loop not required",
  "downloads.browse": "Browse all",
  "downloads.browse.note": "Version folder",

  "version.aria": "Version",
  "version.title": "Version",
  "version.none": "(none published)",
  "version.published": "Published:",
  "version.artifacts": "Artifacts under",
  "version.manifest": "updater manifest at",
  "version.changelog": "Changelog:",
} as const;

const zh: Record<MessageKey, string> = {
  "brand.tagline": "轻量键鼠浮窗，适合直播与录屏。",
  "brand.features.aria": "产品卖点",
  "brand.feature.offline": "离线可用",
  "brand.feature.offline.lead": "无需联网，功能全程可用",
  "brand.feature.size": "不到 3 MB",
  "brand.feature.size.lead": "轻量安装，不占多余空间",
  "brand.feature.oss": "100% 免费",
  "brand.feature.oss.lead": "开源代码，可自由使用",

  "nav.aria": "页面分区",
  "nav.brand": "品牌",
  "nav.stage": "演示",
  "nav.download": "下载",

  "lang.switch": "语言",
  "lang.en": "English",
  "lang.zh": "中文",

  "stage.aria": "交互式按键演示 — 桌面键盘与鼠标",
  "stage.on": "开启",
  "stage.off": "关闭",
  "stage.power": "电源",
  "stage.blinds": "百叶窗",
  "stage.blinds.open": "打开（亮环境）",
  "stage.blinds.closed": "关闭（台灯亮）",
  "stage.blinds.aria": "百叶窗拉绳 — 当前{state}。点击切换室内光线。",
  "stage.help.aria": "演示用法",
  "stage.help": "电源键开关演示 · 拉百叶窗绳切换室内光。",

  "notepad.aria": "演示记事本 — 在此输入",
  "intro.invite": "按任意键接管。",

  "download.panel.title": "获取 z-key-cast",
  "download.panel.lead": "在屏幕上实时同步你的键鼠操作",
  "download.panel.cta": "下载 macOS 版",
  "download.panel.platform": "M 芯片",
  "download.panel.quarantine": "若提示「已损坏」，拖进「应用程序」后执行",
  "download.panel.copy": "复制命令",
  "download.panel.copied": "已复制",

  "cta.download": "下载",
  "cta.latest": "最新：{version}",
  "cta.note": "键鼠可视化。",

  "downloads.aria": "下载",
  "downloads.title": "下载",
  "downloads.windows.note": "占位 — 不要求 updater C-loop",
  "downloads.browse": "浏览全部",
  "downloads.browse.note": "版本目录",

  "version.aria": "版本",
  "version.title": "版本",
  "version.none": "（尚未发布）",
  "version.published": "已发布：",
  "version.artifacts": "产物目录",
  "version.manifest": "更新清单",
  "version.changelog": "更新日志：",
};

const catalogs: Record<UiLocale, Record<MessageKey, string>> = { en, zh };

function applyVars(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

/** Resolve a message; missing key falls back to en then the key string. */
export function t(
  key: MessageKey,
  locale: UiLocale = "en",
  vars?: Record<string, string | number>,
): string {
  const primary = catalogs[locale]?.[key];
  if (primary !== undefined) return applyVars(primary, vars);
  const fallback = catalogs.en[key];
  if (fallback !== undefined) return applyVars(fallback, vars);
  return key;
}

export function isUiLocale(value: unknown): value is UiLocale {
  return value === "en" || value === "zh";
}
