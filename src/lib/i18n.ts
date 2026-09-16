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
  "settings.hudPreset": "HUD preset",
  "settings.hudPreset.text": "Text",
  "settings.hudPreset.lite": "Lite",
  "settings.hudPreset.full": "Full",
  "settings.hudPreset.textHint": "Minimal text chips for key and mouse; fades after dwell.",
  "settings.hudPreset.liteHint": "Keycaps plus mouse diagram; fades after dwell.",
  "settings.hudPreset.fullHint":
    "Always-on keyboard and mouse board; highlights follow hold and release.",
  "settings.keyMouseLayout": "Key / mouse layout",
  "settings.keyMouseLayout.keyLeftMouseRight": "Key left · mouse right",
  "settings.keyMouseLayout.keyRightMouseLeft": "Key right · mouse left",
  "settings.keyMouseLayout.keyTopMouseBottom": "Key above · mouse below",
  "settings.keyMouseLayout.keyBottomMouseTop": "Key below · mouse above",
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
  "settings.dwellMsHint":
    "How long Text/Lite chips stay after input before fading",

  "settings.capture": "Capture",
  "settings.hookActive": "Input hook is active.",
  "settings.hookFailed":
    "Input hook failed — enable Accessibility permission for this app in System Settings, then fully restart the app.",
  "settings.hookWaiting": "Waiting for hook status…",
  "settings.listenKeyboard": "Listen to keyboard",
  "settings.listenMouse": "Listen to mouse",
  "settings.mouseClickRipple": "Click ripple (primary screen)",
  "settings.mouseClickRippleHint":
    "Shows a brief ring at click locations on the main display. Independent of mouse HUD listening. macOS only for now.",
  "settings.ignoreKeys": "Ignore keys",
  "settings.ignoreHint":
    "Click keys on the board to ignore them. Ignored primaries never show; ignored modifiers are stripped from chords. Use Add key for keys not on the board.",
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
  "settings.hudPreset": "HUD 预设",
  "settings.hudPreset.text": "文本",
  "settings.hudPreset.lite": "精简",
  "settings.hudPreset.full": "完整",
  "settings.hudPreset.textHint": "键鼠均为文本条；停留后淡出。",
  "settings.hudPreset.liteHint": "按键卡片 + 鼠标示意图；停留后淡出。",
  "settings.hudPreset.fullHint": "常驻全键盘与鼠标示意图；高亮跟随按下与抬起。",
  "settings.keyMouseLayout": "键鼠布局",
  "settings.keyMouseLayout.keyLeftMouseRight": "键左 · 鼠右",
  "settings.keyMouseLayout.keyRightMouseLeft": "键右 · 鼠左",
  "settings.keyMouseLayout.keyTopMouseBottom": "键上 · 鼠下",
  "settings.keyMouseLayout.keyBottomMouseTop": "键下 · 鼠上",
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
  "settings.dwellMsHint": "文本/精简模式下，输入后芯片停留多久再淡出",

  "settings.capture": "捕获",
  "settings.hookActive": "输入钩子已启用。",
  "settings.hookFailed":
    "输入钩子失败 — 请在系统设置中为本应用开启辅助功能权限，然后完全退出并重新打开应用。",
  "settings.hookWaiting": "正在等待钩子状态…",
  "settings.listenKeyboard": "监听键盘",
  "settings.listenMouse": "监听鼠标",
  "settings.mouseClickRipple": "点击涟漪（主屏）",
  "settings.mouseClickRippleHint":
    "在主显示器点击位置显示短暂圆环。与鼠标 HUD 监听互不影响。目前仅 macOS 生效。",
  "settings.ignoreKeys": "忽略按键",
  "settings.ignoreHint":
    "点击键盘上的按键即可忽略。被忽略的主键不会显示；被忽略的修饰键会从组合中剥离。不在键盘图上的按键请用「添加按键」。",
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
