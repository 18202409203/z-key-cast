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
    #[serde(default)]
    pub hud_preset: HudPreset,
    #[serde(default)]
    pub keyboard_legend_layout: KeyboardLegendLayout,
    #[serde(default)]
    pub key_mouse_layout: KeyMouseLayout,
}

impl Default for HudStyleSettings {
    fn default() -> Self {
        Self {
            font_size_px: 15,
            text_color: "#f8fafc".into(),
            background_color: "#0f172a".into(),
            background_opacity: 0.82,
            dwell_ms: 1000,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
    /// Separate fullscreen click rings; omit → false. Independent of `capture_mouse`.
    #[serde(default)]
    pub mouse_click_ripple: bool,
    #[serde(default)]
    pub ignored_key_ids: Vec<String>,
}

impl Default for CaptureSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
            mouse_click_ripple: false,
            ignored_key_ids: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
    #[serde(default)]
    pub mouse_click_ripple: bool,
    #[serde(default)]
    pub ignored_key_ids: Vec<String>,
    #[serde(default)]
    pub hud: HudStyleSettings,
    #[serde(default)]
    pub hud_position: HudPositionSettings,
    /// Absent until the frontend resolves (system guess or user choice).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ui_locale: Option<UiLocale>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
            mouse_click_ripple: false,
            ignored_key_ids: Vec::new(),
            hud: HudStyleSettings::default(),
            hud_position: HudPositionSettings::default(),
            ui_locale: None,
        }
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
            hud_preset: HudPreset::Full,
            keyboard_legend_layout: KeyboardLegendLayout::Auto,
            key_mouse_layout: KeyMouseLayout::KeyLeftMouseRight,
        }
        .clamp();
        assert_eq!(clamped.font_size_px, 10);
        assert_eq!(clamped.dwell_ms, 200);
        assert_eq!(clamped.background_opacity, 1.0);
        assert_eq!(clamped.text_color, "#f8fafc");
        assert_eq!(clamped.hud_preset, HudPreset::Full);
    }

    #[test]
    fn app_settings_default_hud_when_missing() {
        let raw = r#"{"captureKeyboard":false,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert!(!parsed.capture_keyboard);
        assert!(parsed.capture_mouse);
        assert!(!parsed.mouse_click_ripple);
        assert!(parsed.ignored_key_ids.is_empty());
        assert_eq!(parsed.hud.dwell_ms, 1000);
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
            ignored_key_ids: vec!["Escape".into(), "KeyA".into()],
            hud: HudStyleSettings {
                hud_preset: HudPreset::Full,
                ..HudStyleSettings::default()
            },
            hud_position: HudPositionSettings::Corner {
                corner: HudCorner::Tl,
            },
            ui_locale: Some(UiLocale::Zh),
        };
        let raw = serde_json::to_string(&settings).unwrap();
        let parsed: AppSettings = serde_json::from_str(&raw).unwrap();
        assert!(!parsed.capture_keyboard);
        assert!(parsed.capture_mouse);
        assert!(parsed.mouse_click_ripple);
        assert_eq!(parsed.ignored_key_ids, vec!["Escape", "KeyA"]);
        assert_eq!(parsed.hud.hud_preset, HudPreset::Full);
        assert!(!raw.contains("persistVisible"));
        assert!(!raw.contains("keyboardDisplayMode"));
        assert!(!raw.contains("mouseDisplayMode"));
        assert_eq!(
            parsed.hud_position,
            HudPositionSettings::Corner {
                corner: HudCorner::Tl
            }
        );
        assert_eq!(parsed.ui_locale, Some(UiLocale::Zh));
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
