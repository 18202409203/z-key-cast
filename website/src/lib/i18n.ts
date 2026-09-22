/** Hand-rolled en/zh marketing copy (no i18n framework). */

export type UiLocale = "en" | "zh";

export type MessageKey = keyof typeof en;

const en = {
  "brand.tagline": "Show your keystrokes, without the noise.",

  "scroll.hint": "Scroll",
  "scroll.hint.aria": "Scroll to next section",

  "lang.switch": "Language",
  "lang.en": "English",
  "lang.zh": "中文",

  "stage.aria": "Interactive keystroke demo — desktop keyboard and mouse",
  "stage.on": "On",
  "stage.off": "Off",
  "stage.power": "Power",
  "stage.theme": "HUD appearance",
  "stage.theme.dark": "Dark",
  "stage.theme.light": "Light",
  "stage.theme.aria": "{label} — {current}. Switch to {next}.",
  "stage.help.aria": "How to use the demo",
  "stage.help":
    "Power button toggles the demo · click outside also turns it off. Capture stays on this page only.",

  "notepad.aria": "Demo notepad — type here",
  "intro.invite": "Press any key to take control.",

  "download.panel.title": "Get z-key-cast",
  "download.panel.lead":
    "Lightweight keystroke overlay for streaming & recording.",
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
  "brand.tagline": "在屏幕上实时同步你的键鼠操作",

  "scroll.hint": "向下滚动",
  "scroll.hint.aria": "滚动到下一区",

  "lang.switch": "语言",
  "lang.en": "English",
  "lang.zh": "中文",

  "stage.aria": "交互式按键演示 — 桌面键盘与鼠标",
  "stage.on": "开启",
  "stage.off": "关闭",
  "stage.power": "电源",
  "stage.theme": "HUD 外观",
  "stage.theme.dark": "深色",
  "stage.theme.light": "浅色",
  "stage.theme.aria": "{label} — {current}。切换为 {next}。",
  "stage.help.aria": "演示用法",
  "stage.help": "电源键开关演示 · 外侧点击也可关闭。捕获仅限本页。",

  "notepad.aria": "演示记事本 — 在此输入",
  "intro.invite": "按任意键接管。",

  "download.panel.title": "获取 z-key-cast",
  "download.panel.lead": "轻量键鼠浮窗，适合直播与录屏。",
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
