/** Hand-rolled en/zh UI message catalog (no i18n framework). */

export type UiLocale = "en" | "zh";

export type MessageKey = keyof typeof en;

const en = {
  "nav.settings": "Settings",
  "nav.capture": "Capture",
  "nav.log": "Log",
  "nav.about": "About",
  "nav.aria": "Main sections",

  "about.blurb":
    "Corner HUD for keyboard and mouse actions while screen recording.",
  "about.version": "Version {version}",

  "settings.language": "Language",
  "settings.language.en": "English",
  "settings.language.zh": "中文",

  "settings.presentation": "Presentation",
  "settings.position": "Position",
  "settings.corner": "Corner",
  "settings.corner.br": "Bottom right",
  "settings.corner.bl": "Bottom left",
  "settings.corner.tr": "Top right",
  "settings.corner.tl": "Top left",
  "settings.corner.custom": "Custom",
  "settings.hudPosition": "HUD position",
  "settings.moveHud": "Move HUD",
  "settings.done": "Done",
  "settings.placeHint": "Drag the overlay, then press Done.",

  "settings.hudAppearance": "Appearance",
  "settings.keyboardDisplay": "Keyboard display",
  "settings.keyboardDisplay.text": "Text",
  "settings.keyboardDisplay.keyCard": "Key cards",
  "settings.keyboardDisplay.keyboard": "Full keyboard",
  "settings.mouseDisplay": "Mouse display",
  "settings.mouseDisplay.text": "Text",
  "settings.mouseDisplay.schematic": "Schematic",
  "settings.legendLayout": "Key legend layout",
  "settings.legendLayout.auto": "Auto (guess from OS)",
  "settings.legendLayout.macUs": "Mac US ANSI",
  "settings.legendLayout.winUs": "Windows US ANSI",
  "settings.fontSize": "Font size ({n}px)",
  "settings.colorPreset": "Color preset",
  "settings.colorPreset.dark": "Black (white on black)",
  "settings.colorPreset.light": "White (black on white)",
  "settings.colorPreset.custom": "Custom",
  "settings.textColor": "Text color",
  "settings.bgColor": "Background color",
  "settings.bgOpacity": "Background opacity ({n})",
  "settings.dwellMs": "Dwell (ms)",
  "settings.dwellMsHint": "How long keys stay visible after release",

  "settings.capture": "Capture",
  "settings.hookActive": "Input hook is active.",
  "settings.hookFailed":
    "Input hook failed — enable Accessibility permission for this app in System Settings, then fully restart the app.",
  "settings.hookWaiting": "Waiting for hook status…",
  "settings.listenKeyboard": "Listen to keyboard",
  "settings.listenMouse": "Listen to mouse",
  "settings.ignoreKeys": "Ignore keys",
  "settings.ignoreHint":
    "Ignored primaries never show; ignored modifiers are stripped from chords.",
  "settings.ignoreCategories": "Ignore categories",
  "settings.addKey": "Add key",
  "settings.cancel": "Cancel",
  "settings.pressKey": "Press a key to ignore…",
  "settings.remove": "Remove",
  "settings.removeAria": "Remove {id}",
  "settings.noIgnoredKeys": "No ignored keys.",

  "ignore.category.letters": "Letters",
  "ignore.category.digits": "Digits",
  "ignore.category.function": "Function",
  "ignore.category.arrows": "Arrows",
  "ignore.category.numpad": "Numpad",
  "ignore.category.navigation": "Navigation",
  "ignore.category.punctuation": "Punctuation",

  "log.title": "Event log",
  "log.clear": "Clear",
  "log.empty": "No events yet.",

  "overlay.hookOffline": "Hook offline · {reason}",
  "overlay.denied": "denied",
  "overlay.placeAffordance": "Drag to move · Done in Settings",
  "overlay.placeAria": "HUD place mode — drag to move",
  "overlay.hudAria": "Key cast HUD",
} as const;

const zh: Record<MessageKey, string> = {
  "nav.settings": "设置",
  "nav.capture": "捕获",
  "nav.log": "日志",
  "nav.about": "关于",
  "nav.aria": "主要分区",

  "about.blurb": "录屏时在角落显示键盘与鼠标操作的 HUD。",
  "about.version": "版本 {version}",

  "settings.language": "语言",
  "settings.language.en": "English",
  "settings.language.zh": "中文",

  "settings.presentation": "展示方式",
  "settings.position": "位置",
  "settings.corner": "角落",
  "settings.corner.br": "右下",
  "settings.corner.bl": "左下",
  "settings.corner.tr": "右上",
  "settings.corner.tl": "左上",
  "settings.corner.custom": "自定义",
  "settings.hudPosition": "HUD 位置",
  "settings.moveHud": "移动 HUD",
  "settings.done": "完成",
  "settings.placeHint": "拖动浮层，然后点击完成。",

  "settings.hudAppearance": "外观",
  "settings.keyboardDisplay": "键盘显示",
  "settings.keyboardDisplay.text": "文本",
  "settings.keyboardDisplay.keyCard": "按键卡片",
  "settings.keyboardDisplay.keyboard": "完整键盘",
  "settings.mouseDisplay": "鼠标显示",
  "settings.mouseDisplay.text": "文本",
  "settings.mouseDisplay.schematic": "示意图",
  "settings.legendLayout": "键帽图例布局",
  "settings.legendLayout.auto": "自动（按系统猜测）",
  "settings.legendLayout.macUs": "Mac 美式 ANSI",
  "settings.legendLayout.winUs": "Windows 美式 ANSI",
  "settings.fontSize": "字号（{n}px）",
  "settings.colorPreset": "颜色预设",
  "settings.colorPreset.dark": "黑底白字",
  "settings.colorPreset.light": "白底黑字",
  "settings.colorPreset.custom": "自定义",
  "settings.textColor": "文字颜色",
  "settings.bgColor": "背景颜色",
  "settings.bgOpacity": "背景不透明度（{n}）",
  "settings.dwellMs": "停留时间（毫秒）",
  "settings.dwellMsHint": "按键松开后 HUD 继续显示多久",

  "settings.capture": "捕获",
  "settings.hookActive": "输入钩子已启用。",
  "settings.hookFailed":
    "输入钩子失败 — 请在系统设置中为本应用开启辅助功能权限，然后完全退出并重新打开应用。",
  "settings.hookWaiting": "正在等待钩子状态…",
  "settings.listenKeyboard": "监听键盘",
  "settings.listenMouse": "监听鼠标",
  "settings.ignoreKeys": "忽略按键",
  "settings.ignoreHint": "被忽略的主键不会显示；被忽略的修饰键会从组合中剥离。",
  "settings.ignoreCategories": "忽略分类",
  "settings.addKey": "添加按键",
  "settings.cancel": "取消",
  "settings.pressKey": "请按下要忽略的键…",
  "settings.remove": "移除",
  "settings.removeAria": "移除 {id}",
  "settings.noIgnoredKeys": "暂无忽略的按键。",

  "ignore.category.letters": "字母",
  "ignore.category.digits": "数字",
  "ignore.category.function": "功能键",
  "ignore.category.arrows": "方向键",
  "ignore.category.numpad": "小键盘",
  "ignore.category.navigation": "导航键",
  "ignore.category.punctuation": "标点",

  "log.title": "事件日志",
  "log.clear": "清除",
  "log.empty": "暂无事件。",

  "overlay.hookOffline": "钩子离线 · {reason}",
  "overlay.denied": "已拒绝",
  "overlay.placeAffordance": "拖动以移动 · 在设置中完成",
  "overlay.placeAria": "HUD 定位模式 — 拖动以移动",
  "overlay.hudAria": "按键投射 HUD",
};

const catalogs: Record<UiLocale, Record<MessageKey, string>> = { en, zh };

/** Guess UI locale from a BCP-47 / OS language tag. */
export function guessLocale(tag?: string | null): UiLocale {
  const raw = (tag ?? "").trim().toLowerCase();
  if (raw === "zh" || raw.startsWith("zh-") || raw.startsWith("zh_")) {
    return "zh";
  }
  return "en";
}

/** Prefer navigator language; fall back to en. */
export function guessLocaleFromSystem(): UiLocale {
  if (typeof navigator !== "undefined" && navigator.language) {
    return guessLocale(navigator.language);
  }
  return "en";
}

export function isUiLocale(value: unknown): value is UiLocale {
  return value === "en" || value === "zh";
}

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

export function categoryLabelKey(
  id: string,
): MessageKey | null {
  const key = `ignore.category.${id}` as MessageKey;
  return key in en ? key : null;
}
