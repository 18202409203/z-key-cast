//! Serde shapes, defaults, clamp / legacy HUD style migrate.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HudPreset {
    Text,
    Lite,
    Full,
}

impl Default for HudPreset {
    fn default() -> Self {
        Self::Text
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum KeyboardLegendLayout {
    Auto,
    MacUs,
    WinUs,
}

impl Default for KeyboardLegendLayout {
    fn default() -> Self {
        Self::Auto
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum KeyMouseLayout {
    KeyLeftMouseRight,
    KeyRightMouseLeft,
    KeyTopMouseBottom,
    KeyBottomMouseTop,
}

impl Default for KeyMouseLayout {
    fn default() -> Self {
        Self::KeyLeftMouseRight
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UiLocale {
    En,
    Zh,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UiLocalePayload {
    pub locale: UiLocale,
}

/// Main-window chrome appearance. Omit → treat as `system` on the frontend.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UiAppearance {
    System,
    Dark,
    Light,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UiAppearancePayload {
    pub appearance: UiAppearance,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HudCorner {
    Br,
    Bl,
    Tr,
    Tl,
}

impl Default for HudCorner {
    fn default() -> Self {
        Self::Br
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum HudPositionSettings {
    Corner { corner: HudCorner },
    Custom { x: i32, y: i32 },
}

impl Default for HudPositionSettings {
    fn default() -> Self {
        Self::Corner {
            corner: HudCorner::Br,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HudPlaceModePayload {
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HudStyleSettings {
    pub font_size_px: u32,
    pub text_color: String,
    pub background_color: String,
    pub background_opacity: f64,
    pub dwell_ms: u32,
    /// Text/Lite operation timeline length. Omit → 5; clamp 1..=10.
    #[serde(default = "default_timeline_max")]
    pub timeline_max: u32,
    #[serde(default)]
    pub hud_preset: HudPreset,
    #[serde(default)]
    pub keyboard_legend_layout: KeyboardLegendLayout,
    #[serde(default)]
    pub key_mouse_layout: KeyMouseLayout,
}

fn default_timeline_max() -> u32 {
    5
}

impl Default for HudStyleSettings {
    fn default() -> Self {
        Self {
            font_size_px: 15,
            text_color: "#f8fafc".into(),
            background_color: "#0f172a".into(),
            background_opacity: 0.82,
            dwell_ms: 1000,
            timeline_max: default_timeline_max(),
            hud_preset: HudPreset::Text,
            keyboard_legend_layout: KeyboardLegendLayout::Auto,
            key_mouse_layout: KeyMouseLayout::KeyLeftMouseRight,
        }
    }
}

/// Intermediate deserialize shape that accepts legacy dual display modes.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HudStyleSettingsDe {
    font_size_px: u32,
    text_color: String,
    background_color: String,
    background_opacity: f64,
    dwell_ms: u32,
    #[serde(default = "default_timeline_max")]
    timeline_max: u32,
    /// Parsed as string so garbage values become `Text` instead of failing the file.
    #[serde(default)]
    hud_preset: Option<String>,
    /// Legacy → maps to `hud_preset` when preset absent.
    #[serde(default)]
    keyboard_display_mode: Option<String>,
    #[serde(default)]
    keyboard_legend_layout: KeyboardLegendLayout,
    #[serde(default)]
    key_mouse_layout: KeyMouseLayout,
}

fn hud_preset_from_raw(
    hud_preset: Option<&str>,
    keyboard_display_mode: Option<&str>,
) -> HudPreset {
    match hud_preset {
        Some("text") => HudPreset::Text,
        Some("lite") => HudPreset::Lite,
        Some("full") => HudPreset::Full,
        Some(_) => HudPreset::Text, // garbage → text
        None => match keyboard_display_mode {
            Some("key-card") => HudPreset::Lite,
            Some("keyboard") => HudPreset::Full,
            _ => HudPreset::Text,
        },
    }
}

impl<'de> Deserialize<'de> for HudStyleSettings {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = HudStyleSettingsDe::deserialize(deserializer)?;
        let hud_preset =
            hud_preset_from_raw(raw.hud_preset.as_deref(), raw.keyboard_display_mode.as_deref());
        Ok(Self {
            font_size_px: raw.font_size_px,
            text_color: raw.text_color,
            background_color: raw.background_color,
            background_opacity: raw.background_opacity,
            dwell_ms: raw.dwell_ms,
            timeline_max: raw.timeline_max,
            hud_preset,
            keyboard_legend_layout: raw.keyboard_legend_layout,
            key_mouse_layout: raw.key_mouse_layout,
        })
    }
}

impl HudStyleSettings {
    pub(crate) fn clamp(mut self) -> Self {
        self.font_size_px = self.font_size_px.clamp(10, 48);
        self.dwell_ms = self.dwell_ms.clamp(200, 5_000);
        self.timeline_max = self.timeline_max.clamp(1, 10);
        self.background_opacity = self.background_opacity.clamp(0.0, 1.0);
        if !is_hex_color(&self.text_color) {
            self.text_color = Self::default().text_color;
        }
        if !is_hex_color(&self.background_color) {
            self.background_color = Self::default().background_color;
        }
        self
    }
}

fn is_hex_color(value: &str) -> bool {
    let rest = value.strip_prefix('#').unwrap_or("");
    matches!(rest.len(), 3 | 6) && rest.chars().all(|c| c.is_ascii_hexdigit())
}

/// Wire values for `ignoredMouseActions` (`"left" | "right" | "middle" | "scroll"`).
pub const MOUSE_ACTION_LEFT: &str = "left";
pub const MOUSE_ACTION_RIGHT: &str = "right";
pub const MOUSE_ACTION_MIDDLE: &str = "middle";
pub const MOUSE_ACTION_SCROLL: &str = "scroll";

fn is_valid_mouse_action(id: &str) -> bool {
    matches!(
        id,
        MOUSE_ACTION_LEFT | MOUSE_ACTION_RIGHT | MOUSE_ACTION_MIDDLE | MOUSE_ACTION_SCROLL
    )
}

/// Dedupe valid mouse-action ids; preserve order; drop empties / unknowns.
pub fn normalize_ignored_mouse_actions(ids: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::with_capacity(ids.len());
    for id in ids {
        if !is_valid_mouse_action(&id) {
            continue;
        }
        if seen.insert(id.clone()) {
            out.push(id);
        }
    }
    out
}

/// Legacy: `captureScroll: false` → ensure `"scroll"` is in the ignore list.
fn migrate_capture_scroll(
    actions: Vec<String>,
    capture_scroll: Option<bool>,
) -> Vec<String> {
    let mut actions = normalize_ignored_mouse_actions(actions);
    if capture_scroll == Some(false)
        && !actions.iter().any(|a| a == MOUSE_ACTION_SCROLL)
    {
        actions.push(MOUSE_ACTION_SCROLL.into());
    }
    actions
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CaptureSettingsDe {
    capture_keyboard: bool,
    capture_mouse: bool,
    /// Legacy peer toggle; `false` migrates into `ignoredMouseActions` + `"scroll"`.
    #[serde(default)]
    capture_scroll: Option<bool>,
    #[serde(default)]
    mouse_click_ripple: bool,
    #[serde(default)]
    has_numpad: bool,
    #[serde(default)]
    ignored_key_ids: Vec<String>,
    #[serde(default)]
    ignored_mouse_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
    /// Separate fullscreen click rings; omit → false. Independent of `capture_mouse`.
    #[serde(default)]
    pub mouse_click_ripple: bool,
    /// Hardware declaration: draw numpad column on KeyboardMap. Omit → false.
    #[serde(default)]
    pub has_numpad: bool,
    #[serde(default)]
    pub ignored_key_ids: Vec<String>,
    /// Drop mouse/scroll chips whose category is listed. Default [].
    #[serde(default)]
    pub ignored_mouse_actions: Vec<String>,
}

impl Default for CaptureSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
            mouse_click_ripple: false,
            has_numpad: false,
            ignored_key_ids: Vec::new(),
            ignored_mouse_actions: Vec::new(),
        }
    }
}

impl<'de> Deserialize<'de> for CaptureSettings {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = CaptureSettingsDe::deserialize(deserializer)?;
        Ok(Self {
            capture_keyboard: raw.capture_keyboard,
            capture_mouse: raw.capture_mouse,
            mouse_click_ripple: raw.mouse_click_ripple,
            has_numpad: raw.has_numpad,
            ignored_key_ids: raw.ignored_key_ids,
            ignored_mouse_actions: migrate_capture_scroll(
                raw.ignored_mouse_actions,
                raw.capture_scroll,
            ),
        })
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettingsDe {
    capture_keyboard: bool,
    capture_mouse: bool,
    #[serde(default)]
    capture_scroll: Option<bool>,
    #[serde(default)]
    mouse_click_ripple: bool,
    #[serde(default)]
    has_numpad: bool,
    #[serde(default)]
    ignored_key_ids: Vec<String>,
    #[serde(default)]
    ignored_mouse_actions: Vec<String>,
    #[serde(default)]
    hud: HudStyleSettings,
    #[serde(default)]
    hud_position: HudPositionSettings,
    #[serde(default)]
    ui_locale: Option<UiLocale>,
    #[serde(default)]
    ui_appearance: Option<UiAppearance>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
    #[serde(default)]
    pub mouse_click_ripple: bool,
    #[serde(default)]
    pub has_numpad: bool,
    #[serde(default)]
    pub ignored_key_ids: Vec<String>,
    #[serde(default)]
    pub ignored_mouse_actions: Vec<String>,
    #[serde(default)]
    pub hud: HudStyleSettings,
    #[serde(default)]
    pub hud_position: HudPositionSettings,
    /// Absent until the frontend resolves (system guess or user choice).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ui_locale: Option<UiLocale>,
    /// Absent → frontend treats as `system`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ui_appearance: Option<UiAppearance>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
            mouse_click_ripple: false,
            has_numpad: false,
            ignored_key_ids: Vec::new(),
            ignored_mouse_actions: Vec::new(),
            hud: HudStyleSettings::default(),
            hud_position: HudPositionSettings::default(),
            ui_locale: None,
            ui_appearance: None,
        }
    }
}

impl<'de> Deserialize<'de> for AppSettings {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = AppSettingsDe::deserialize(deserializer)?;
        Ok(Self {
            capture_keyboard: raw.capture_keyboard,
            capture_mouse: raw.capture_mouse,
            mouse_click_ripple: raw.mouse_click_ripple,
            has_numpad: raw.has_numpad,
            ignored_key_ids: raw.ignored_key_ids,
            ignored_mouse_actions: migrate_capture_scroll(
                raw.ignored_mouse_actions,
                raw.capture_scroll,
            ),
            hud: raw.hud,
            hud_position: raw.hud_position,
            ui_locale: raw.ui_locale,
            ui_appearance: raw.ui_appearance,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hud_clamp_bounds() {
        let clamped = HudStyleSettings {
            font_size_px: 3,
            text_color: "red".into(),
            background_color: "#0f172a".into(),
            background_opacity: 2.0,
            dwell_ms: 10,
            timeline_max: 0,
            hud_preset: HudPreset::Full,
            keyboard_legend_layout: KeyboardLegendLayout::Auto,
            key_mouse_layout: KeyMouseLayout::KeyLeftMouseRight,
        }
        .clamp();
        assert_eq!(clamped.font_size_px, 10);
        assert_eq!(clamped.dwell_ms, 200);
        assert_eq!(clamped.timeline_max, 1);
        assert_eq!(clamped.background_opacity, 1.0);
        assert_eq!(clamped.text_color, "#f8fafc");
        assert_eq!(clamped.hud_preset, HudPreset::Full);

        let high = HudStyleSettings {
            timeline_max: 99,
            ..HudStyleSettings::default()
        }
        .clamp();
        assert_eq!(high.timeline_max, 10);
    }

    #[test]
    fn timeline_max_omitted_defaults_to_five() {
        let omitted = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{"fontSizePx":15,"textColor":"#f8fafc","backgroundColor":"#0f172a","backgroundOpacity":0.82,"dwellMs":1000}
        }"##;
        let parsed: AppSettings = serde_json::from_str(omitted).unwrap();
        assert_eq!(parsed.hud.timeline_max, 5);

        let set = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{"fontSizePx":15,"textColor":"#f8fafc","backgroundColor":"#0f172a","backgroundOpacity":0.82,"dwellMs":1000,"timelineMax":8}
        }"##;
        let parsed: AppSettings = serde_json::from_str(set).unwrap();
        assert_eq!(parsed.hud.timeline_max, 8);
    }

    #[test]
    fn legacy_timeline_grow_field_ignored() {
        let with_legacy = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{
                "fontSizePx":15,
                "textColor":"#f8fafc",
                "backgroundColor":"#0f172a",
                "backgroundOpacity":0.82,
                "dwellMs":1000,
                "timelineGrow":"to-left"
            }
        }"##;
        let parsed: AppSettings = serde_json::from_str(with_legacy).unwrap();
        assert_eq!(parsed.hud.timeline_max, 5);
        assert_eq!(parsed.hud.hud_preset, HudPreset::Text);
    }

    #[test]
    fn app_settings_default_hud_when_missing() {
        let raw = r#"{"captureKeyboard":false,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert!(!parsed.capture_keyboard);
        assert!(parsed.capture_mouse);
        assert!(!parsed.mouse_click_ripple);
        assert!(!parsed.has_numpad);
        assert!(parsed.ignored_key_ids.is_empty());
        assert!(parsed.ignored_mouse_actions.is_empty());
        assert_eq!(parsed.hud.dwell_ms, 1000);
        assert_eq!(parsed.hud.timeline_max, 5);
        assert_eq!(parsed.hud.hud_preset, HudPreset::Text);
        assert_eq!(
            parsed.hud.key_mouse_layout,
            KeyMouseLayout::KeyLeftMouseRight
        );
        assert_eq!(
            parsed.hud_position,
            HudPositionSettings::Corner {
                corner: HudCorner::Br
            }
        );
        assert_eq!(parsed.ui_locale, None);
        assert_eq!(parsed.ui_appearance, None);
    }

    #[test]
    fn mouse_click_ripple_omitted_defaults_false() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert!(!parsed.mouse_click_ripple);

        let enabled = r#"{"captureKeyboard":true,"captureMouse":false,"mouseClickRipple":true}"#;
        let parsed: AppSettings = serde_json::from_str(enabled).unwrap();
        assert!(parsed.mouse_click_ripple);
        assert!(!parsed.capture_mouse);
    }

    #[test]
    fn ignored_mouse_actions_default_empty() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert!(parsed.ignored_mouse_actions.is_empty());
        let capture: CaptureSettings = serde_json::from_str(raw).unwrap();
        assert!(capture.ignored_mouse_actions.is_empty());
    }

    #[test]
    fn legacy_capture_scroll_false_migrates_to_ignore_scroll() {
        let off = r#"{"captureKeyboard":true,"captureMouse":true,"captureScroll":false}"#;
        let parsed: AppSettings = serde_json::from_str(off).unwrap();
        assert_eq!(parsed.ignored_mouse_actions, vec!["scroll"]);
        let capture: CaptureSettings = serde_json::from_str(off).unwrap();
        assert_eq!(capture.ignored_mouse_actions, vec!["scroll"]);

        let already = r#"{"captureKeyboard":true,"captureMouse":true,"captureScroll":false,"ignoredMouseActions":["left","scroll"]}"#;
        let parsed: AppSettings = serde_json::from_str(already).unwrap();
        assert_eq!(parsed.ignored_mouse_actions, vec!["left", "scroll"]);
    }

    #[test]
    fn ignored_mouse_actions_drops_unknown_and_dedupes() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true,"ignoredMouseActions":["left","nope","left","scroll"]}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.ignored_mouse_actions, vec!["left", "scroll"]);
    }

    #[test]
    fn has_numpad_omitted_defaults_false() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert!(!parsed.has_numpad);

        let capture: CaptureSettings = serde_json::from_str(raw).unwrap();
        assert!(!capture.has_numpad);
    }

    #[test]
    fn has_numpad_explicit_true_roundtrips() {
        let settings = AppSettings {
            capture_keyboard: true,
            capture_mouse: true,
            mouse_click_ripple: false,
            has_numpad: true,
            ignored_key_ids: Vec::new(),
            ignored_mouse_actions: Vec::new(),
            hud: HudStyleSettings::default(),
            hud_position: HudPositionSettings::default(),
            ui_locale: None,
            ui_appearance: None,
        };
        let raw = serde_json::to_string(&settings).unwrap();
        assert!(raw.contains("\"hasNumpad\":true"));
        assert!(!raw.contains("captureScroll"));
        let parsed: AppSettings = serde_json::from_str(&raw).unwrap();
        assert!(parsed.has_numpad);

        let capture = CaptureSettings {
            capture_keyboard: true,
            capture_mouse: true,
            mouse_click_ripple: false,
            has_numpad: true,
            ignored_key_ids: Vec::new(),
            ignored_mouse_actions: vec!["middle".into()],
        };
        let raw = serde_json::to_string(&capture).unwrap();
        let parsed: CaptureSettings = serde_json::from_str(&raw).unwrap();
        assert!(parsed.has_numpad);
        assert_eq!(parsed.ignored_mouse_actions, vec!["middle"]);
    }

    #[test]
    fn hud_preset_omitted_defaults_text() {
        let omitted = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{"fontSizePx":15,"textColor":"#f8fafc","backgroundColor":"#0f172a","backgroundOpacity":0.82,"dwellMs":1000}
        }"##;
        let parsed: AppSettings = serde_json::from_str(omitted).unwrap();
        assert_eq!(parsed.hud.hud_preset, HudPreset::Text);

        let full = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{
                "fontSizePx":15,
                "textColor":"#f8fafc",
                "backgroundColor":"#0f172a",
                "backgroundOpacity":0.82,
                "dwellMs":1000,
                "hudPreset":"full"
            }
        }"##;
        let parsed: AppSettings = serde_json::from_str(full).unwrap();
        assert_eq!(parsed.hud.hud_preset, HudPreset::Full);
        assert!(parsed.capture_keyboard);
        assert!(parsed.capture_mouse);
        assert_eq!(parsed.hud.dwell_ms, 1000);
    }

    #[test]
    fn hud_preset_migrates_from_legacy_keyboard_mode() {
        let legacy = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{
                "fontSizePx":15,
                "textColor":"#f8fafc",
                "backgroundColor":"#0f172a",
                "backgroundOpacity":0.82,
                "dwellMs":1000,
                "keyboardDisplayMode":"key-card",
                "mouseDisplayMode":"schematic",
                "persistVisible":true
            }
        }"##;
        let parsed: AppSettings = serde_json::from_str(legacy).unwrap();
        assert_eq!(parsed.hud.hud_preset, HudPreset::Lite);

        let keyboard = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{
                "fontSizePx":15,
                "textColor":"#f8fafc",
                "backgroundColor":"#0f172a",
                "backgroundOpacity":0.82,
                "dwellMs":1000,
                "keyboardDisplayMode":"keyboard"
            }
        }"##;
        let parsed: AppSettings = serde_json::from_str(keyboard).unwrap();
        assert_eq!(parsed.hud.hud_preset, HudPreset::Full);
    }

    #[test]
    fn hud_preset_garbage_defaults_text_without_wiping_siblings() {
        let raw = r##"{
            "captureKeyboard":false,
            "captureMouse":true,
            "ignoredKeyIds":["Escape"],
            "hud":{
                "fontSizePx":15,
                "textColor":"#f8fafc",
                "backgroundColor":"#0f172a",
                "backgroundOpacity":0.82,
                "dwellMs":1000,
                "hudPreset":"not-a-preset"
            }
        }"##;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.hud.hud_preset, HudPreset::Text);
        assert!(!parsed.capture_keyboard);
        assert_eq!(parsed.ignored_key_ids, vec!["Escape"]);
    }

    #[test]
    fn hud_preset_roundtrip_keeps_sibling_fields() {
        let settings = AppSettings {
            capture_keyboard: false,
            capture_mouse: true,
            mouse_click_ripple: true,
            has_numpad: false,
            ignored_key_ids: vec!["Escape".into(), "KeyA".into()],
            ignored_mouse_actions: vec!["right".into(), "scroll".into()],
            hud: HudStyleSettings {
                hud_preset: HudPreset::Full,
                ..HudStyleSettings::default()
            },
            hud_position: HudPositionSettings::Corner {
                corner: HudCorner::Tl,
            },
            ui_locale: Some(UiLocale::Zh),
            ui_appearance: Some(UiAppearance::Light),
        };
        let raw = serde_json::to_string(&settings).unwrap();
        let parsed: AppSettings = serde_json::from_str(&raw).unwrap();
        assert!(!parsed.capture_keyboard);
        assert!(parsed.capture_mouse);
        assert!(parsed.mouse_click_ripple);
        assert!(!parsed.has_numpad);
        assert_eq!(parsed.ignored_key_ids, vec!["Escape", "KeyA"]);
        assert_eq!(parsed.ignored_mouse_actions, vec!["right", "scroll"]);
        assert_eq!(parsed.hud.hud_preset, HudPreset::Full);
        assert!(!raw.contains("persistVisible"));
        assert!(!raw.contains("keyboardDisplayMode"));
        assert!(!raw.contains("mouseDisplayMode"));
        assert!(!raw.contains("captureScroll"));
        assert_eq!(
            parsed.hud_position,
            HudPositionSettings::Corner {
                corner: HudCorner::Tl
            }
        );
        assert_eq!(parsed.ui_locale, Some(UiLocale::Zh));
        assert_eq!(parsed.ui_appearance, Some(UiAppearance::Light));
    }

    #[test]
    fn key_mouse_layout_defaults_when_omitted_and_parses() {
        let omitted = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{"fontSizePx":15,"textColor":"#f8fafc","backgroundColor":"#0f172a","backgroundOpacity":0.82,"dwellMs":1000}
        }"##;
        let parsed: AppSettings = serde_json::from_str(omitted).unwrap();
        assert_eq!(
            parsed.hud.key_mouse_layout,
            KeyMouseLayout::KeyLeftMouseRight
        );

        let flipped = r##"{
            "captureKeyboard":true,
            "captureMouse":true,
            "hud":{
                "fontSizePx":15,
                "textColor":"#f8fafc",
                "backgroundColor":"#0f172a",
                "backgroundOpacity":0.82,
                "dwellMs":1000,
                "keyMouseLayout":"key-right-mouse-left"
            }
        }"##;
        let parsed: AppSettings = serde_json::from_str(flipped).unwrap();
        assert_eq!(
            parsed.hud.key_mouse_layout,
            KeyMouseLayout::KeyRightMouseLeft
        );
    }

    #[test]
    fn app_settings_parses_ui_locale() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true,"uiLocale":"zh"}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.ui_locale, Some(UiLocale::Zh));
    }

    #[test]
    fn app_settings_parses_ui_appearance() {
        let omitted = r#"{"captureKeyboard":true,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(omitted).unwrap();
        assert_eq!(parsed.ui_appearance, None);

        let dark = r#"{"captureKeyboard":true,"captureMouse":true,"uiAppearance":"dark"}"#;
        let parsed: AppSettings = serde_json::from_str(dark).unwrap();
        assert_eq!(parsed.ui_appearance, Some(UiAppearance::Dark));

        let light = r#"{"captureKeyboard":true,"captureMouse":true,"uiAppearance":"light"}"#;
        let parsed: AppSettings = serde_json::from_str(light).unwrap();
        assert_eq!(parsed.ui_appearance, Some(UiAppearance::Light));

        let system = r#"{"captureKeyboard":true,"captureMouse":true,"uiAppearance":"system"}"#;
        let parsed: AppSettings = serde_json::from_str(system).unwrap();
        assert_eq!(parsed.ui_appearance, Some(UiAppearance::System));
    }

    #[test]
    fn app_settings_parses_ignored_key_ids() {
        let raw =
            r#"{"captureKeyboard":true,"captureMouse":true,"ignoredKeyIds":["KeyA","Escape"]}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.ignored_key_ids, vec!["KeyA", "Escape"]);
    }

    #[test]
    fn hud_position_default_is_corner_br() {
        assert_eq!(
            HudPositionSettings::default(),
            HudPositionSettings::Corner {
                corner: HudCorner::Br
            }
        );
    }

    #[test]
    fn hud_position_deserializes_corner() {
        let raw = r#"{"mode":"corner","corner":"tl"}"#;
        let parsed: HudPositionSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(
            parsed,
            HudPositionSettings::Corner {
                corner: HudCorner::Tl
            }
        );
    }

    #[test]
    fn hud_position_deserializes_custom() {
        let raw = r#"{"mode":"custom","x":120,"y":340}"#;
        let parsed: HudPositionSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed, HudPositionSettings::Custom { x: 120, y: 340 });
    }
}
