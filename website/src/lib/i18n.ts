/** Hand-rolled en/zh marketing copy (no i18n framework). */

export type UiLocale = "en" | "zh";

export type MessageKey = keyof typeof en;

const en = {
  "brand.tagline":
    "Lightweight keystroke overlay for streaming & recording.",

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
  "download.panel.cta": "Download Latest Version",

  /** Kept for future first-screen / Windows CTA reuse. */
  "cta.download": "Download",
  "cta.latest": "Latest: {version}",
  "cta.note": "Keyboard & mouse visualization.",

  "downloads.aria": "Downloads",
  "downloads.title": "Downloads",
  "downloads.macos.note":
    "Open folder if no artifact yet — run pnpm site:publish-test",
  "downloads.windows.note": "Placeholder — updater C-loop not required",
  "downloads.browse": "Browse all",
  "downloads.browse.note": "Version folder",
  "downloads.versionNote": "v{version}",

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
  "download.panel.cta": "下载最新版本",

  "cta.download": "下载",
  "cta.latest": "最新：{version}",
  "cta.note": "键鼠可视化。",

  "downloads.aria": "下载",
  "downloads.title": "下载",
  "downloads.macos.note":
    "若尚无产物请打开目录 — 运行 pnpm site:publish-test",
  "downloads.windows.note": "占位 — 不要求 updater C-loop",
  "downloads.browse": "浏览全部",
  "downloads.browse.note": "版本目录",
  "downloads.versionNote": "v{version}",

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
