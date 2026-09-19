/** Hand-rolled en/zh UI message catalog (no i18n framework). */

export type UiLocale = "en" | "zh";

export type MessageKey = keyof typeof en;

const en = {
  "nav.hud": "HUD",
  "nav.appearance": "Appearance",
  "nav.capture": "Capture",
  "nav.log": "Log",
  "nav.about": "About",
  "nav.aria": "Main sections",

  "about.blurb":
    "Show keyboard and mouse actions on the screen.",
  "about.version": "Version {version}",

  "settings.language": "Language",
  "settings.language.en": "English",
  "settings.language.zh": "中文",

  "settings.appearance": "Window appearance",
  "settings.appearance.system": "System",
  "settings.appearance.dark": "Dark",
  "settings.appearance.light": "Light",
  "settings.appearanceHint": "Main window chrome only — does not change HUD colors.",

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

  "settings.theme": "Theme",
  "settings.hudPreset": "HUD preset",
  "settings.hudPreset.text": "Text",
  "settings.hudPreset.lite": "Lite",
  "settings.hudPreset.full": "Full",
  "settings.hudPreset.textHint":
    "Text operation timeline (keys, mouse, scroll); length set below; fades after dwell.",
  "settings.hudPreset.liteHint":
    "Styled operation timeline: keycaps and compact mouse/wheel glyphs; length set below; fades after dwell.",
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
    "How long Text/Lite chips stay after input before fading (200–5000)",
  "settings.timelineMax": "Timeline length ({n})",
  "settings.timelineMaxHint":
    "Max Text/Lite chips visible at once (1–10). Shrinking drops oldest immediately.",

  "settings.capture": "Capture",
  "settings.captureFailedMac":
    "Can't listen to the keyboard and mouse yet. Open System Settings → Privacy & Security → Accessibility, enable this app, then quit and reopen it.",
  "settings.captureFailedWin":
    "Can't listen to the keyboard and mouse. Restart the app. Capturing input from apps that run as Administrator may require running this app as Administrator too.",
  "settings.captureFailedOther":
    "Keyboard and mouse capture isn't available on this platform yet.",
  "settings.listenKeyboard": "Listen to keyboard",
  "settings.listenMouse": "Listen to mouse",
  "settings.keyboardSection": "Keyboard",
  "settings.mouseSection": "Mouse",
  "settings.mouseClickRipple": "Click ripple (primary screen)",
  "settings.mouseClickRippleHint":
    "Shows a brief ring at click locations on the primary display.",
  "settings.hasNumpad": "Has numpad",
  "settings.hasNumpadHint":
    "Select whether your keyboard has a numpad.",
  "settings.ignoreKeys": "Ignore keys",
  "settings.ignoreHint":
    "Click keys on the board to ignore them. Ignored primaries never show; ignored modifiers are stripped from chords. Use Add key for keys not on the board.",
  "settings.ignoreCategories": "Ignore categories",
  "settings.ignoreMouse": "Ignore mouse actions",
  "settings.ignoreMouseHint":
    "Hide those mouse categories from the HUD.",
  "settings.ignoreMouse.left": "Left",
  "settings.ignoreMouse.right": "Right",
  "settings.ignoreMouse.middle": "Middle",
  "settings.ignoreMouse.scroll": "Scroll",
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

  "overlay.captureUnavailable": "Can't capture keyboard & mouse — check system permissions",
  "overlay.placeAffordance": "Drag to move · Done in HUD",
  "overlay.placeAria": "HUD place mode — drag to move",
  "overlay.hudAria": "Key cast HUD",

  "hud.chip.mouse.left": "LMB",
  "hud.chip.mouse.right": "RMB",
  "hud.chip.mouse.middle": "MMB",
  "hud.chip.scroll.up": "Scr↑",
  "hud.chip.scroll.down": "Scr↓",
} as const;

const zh: Record<MessageKey, string> = {
  "nav.hud": "显示",
  "nav.appearance": "外观",
  "nav.capture": "捕获",
  "nav.log": "日志",
  "nav.about": "关于",
  "nav.aria": "主要分区",

  "about.blurb": "在屏幕上显示键盘与鼠标。",
  "about.version": "版本 {version}",

  "settings.language": "语言",
  "settings.language.en": "English",
  "settings.language.zh": "中文",

  "settings.appearance": "窗口外观",
  "settings.appearance.system": "跟随系统",
  "settings.appearance.dark": "深色",
  "settings.appearance.light": "浅色",
  "settings.appearanceHint": "仅主窗口外观，不影响面板配色。",

  "settings.presentation": "展示方式",
  "settings.position": "位置",
  "settings.corner": "角落",
  "settings.corner.br": "右下",
  "settings.corner.bl": "左下",
  "settings.corner.tr": "右上",
  "settings.corner.tl": "左上",
  "settings.corner.custom": "自定义",
  "settings.hudPosition": "面板位置",
  "settings.moveHud": "移动面板",
  "settings.done": "完成",
  "settings.placeHint": "拖动浮层，然后点击完成。",

  "settings.theme": "主题",
  "settings.hudPreset": "面板预设",
  "settings.hudPreset.text": "文本",
  "settings.hudPreset.lite": "精简",
  "settings.hudPreset.full": "完整",
  "settings.hudPreset.textHint": "文本操作时间线（键、鼠、滚轮），条数见下方设置；停留后淡出。",
  "settings.hudPreset.liteHint":
    "样式化操作时间线：按键卡片 + 缩小鼠/轮图例，条数见下方设置；停留后淡出。",
  "settings.hudPreset.fullHint": "常驻全键盘与鼠标示意图；高亮跟随按下与抬起。",
  "settings.keyMouseLayout": "键鼠布局",
  "settings.keyMouseLayout.keyLeftMouseRight": "键左 · 鼠右",
  "settings.keyMouseLayout.keyRightMouseLeft": "键右 · 鼠左",
  "settings.keyMouseLayout.keyTopMouseBottom": "键上 · 鼠下",
  "settings.keyMouseLayout.keyBottomMouseTop": "键下 · 鼠上",
  "settings.legendLayout": "键位布局",
  "settings.legendLayout.auto": "自动（自动检测系统）",
  "settings.legendLayout.macUs": "Mac 美式 ANSI",
  "settings.legendLayout.winUs": "Windows 美式 ANSI",
  "settings.fontSize": "字号（{n}px）",
  "settings.colorPreset": "颜色预设",
  "settings.colorPreset.dark": "黑底白字",
  "settings.colorPreset.light": "白底黑字",
  "settings.colorPreset.custom": "自定义",
  "settings.textColor": "文字颜色",
  "settings.bgColor": "背景颜色",
  "settings.bgOpacity": "背景透明度（{n}）",
  "settings.dwellMs": "停留时长（毫秒）",
  "settings.dwellMsHint":
    "文本/精简模式下，输入后文字/卡片停留多久再淡出（200–5000 毫秒）",
  "settings.timelineMax": "时间线条数（{n}）",
  "settings.timelineMaxHint":
    "文本/精简模式同时可见的最多条数（1–10）。调小会立刻丢掉最旧的条目。",

  "settings.capture": "捕获",
  "settings.captureFailedMac":
    "还不能监听键盘和鼠标。请打开「系统设置 → 隐私与安全性 → 辅助功能」，开启本应用权限，然后完全退出并重新打开应用。",
  "settings.captureFailedWin":
    "无法监听键盘和鼠标。请重启应用。若要捕获以管理员身份运行的应用，可能需要以管理员身份运行本应用。",
  "settings.captureFailedOther": "当前平台暂不支持键盘和鼠标捕获。",
  "settings.listenKeyboard": "监听键盘",
  "settings.listenMouse": "监听鼠标",
  "settings.keyboardSection": "键盘",
  "settings.mouseSection": "鼠标",
  "settings.mouseClickRipple": "点击涟漪",
  "settings.mouseClickRippleHint":
    "在主显示器点击位置显示短暂圆环。",
  "settings.hasNumpad": "小键盘",
  "settings.hasNumpadHint":
    "选择您的键盘是否带有小键盘。",
  "settings.ignoreKeys": "忽略按键",
  "settings.ignoreHint":
    "点击键盘上的按键即可忽略。被忽略的主键不会显示；被忽略的修饰键会从组合中剥离。不在键盘图上的按键请用「添加按键」。",
  "settings.ignoreCategories": "忽略分类",
  "settings.ignoreMouse": "忽略鼠标操作",
  "settings.ignoreMouseHint":
    "在 HUD 中隐藏这些鼠标类别。",
  "settings.ignoreMouse.left": "左键",
  "settings.ignoreMouse.right": "右键",
  "settings.ignoreMouse.middle": "中键",
  "settings.ignoreMouse.scroll": "滚轮",
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

  "overlay.captureUnavailable": "无法捕获键盘和鼠标 — 请检查系统权限",
  "overlay.placeAffordance": "拖动以移动 · 在显示中完成",
  "overlay.placeAria": "面板定位模式 — 拖动以移动",
  "overlay.hudAria": "按键投射面板",

  "hud.chip.mouse.left": "左键",
  "hud.chip.mouse.right": "右键",
  "hud.chip.mouse.middle": "中键",
  "hud.chip.scroll.up": "向上滚",
  "hud.chip.scroll.down": "向下滚",
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
