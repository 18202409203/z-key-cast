/** Hand-rolled en/zh marketing copy (no i18n framework). */

export type UiLocale = "en" | "zh";

export type MessageKey = keyof typeof en;

const en = {
  "brand.tagline": "Show your keystrokes, without the noise.",

  "lang.switch": "Language",
  "lang.en": "English",
  "lang.zh": "中文",

  "stage.aria": "Interactive keystroke demo — desktop keyboard and mouse",
  "stage.on": "On — keys & mouse captured · click outside to power off",
  "stage.off": "Off — click the monitor or desk to power on",

  "notepad.aria": "Demo notepad — type here",
  "intro.invite": "Press any key to take control.",

  "cta.download": "Download",
  "cta.latest": "Latest: {version}",
  "cta.note": "Keyboard & mouse visualization.",

  "boundary.aria": "Capability boundary",
  "boundary.body":
    "While the screen is on, this page captures keyboard, mouse, and wheel for the demo (not OS-global). Click outside the desk once to power off — then Download and normal browsing work again.",

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

  "lang.switch": "语言",
  "lang.en": "English",
  "lang.zh": "中文",

  "stage.aria": "交互式按键演示 — 桌面键盘与鼠标",
  "stage.on": "已开启 — 正在捕获键盘与鼠标 · 点击外侧关闭",
  "stage.off": "已关闭 — 点击显示器或桌面开启",

  "notepad.aria": "演示记事本 — 在此输入",
  "intro.invite": "按任意键接管。",

  "cta.download": "下载",
  "cta.latest": "最新：{version}",
  "cta.note": "键鼠可视化。",

  "boundary.aria": "能力边界",
  "boundary.body":
    "屏幕开启时，本页会捕获键盘、鼠标与滚轮用于演示（非系统全局）。点击桌面外侧一次即可关闭 — 之后可正常下载与浏览。",

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
