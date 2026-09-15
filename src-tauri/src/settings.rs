//! Durable app settings: capture toggles + HUD appearance.

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::input::HudChip;

static CAPTURE_KEYBOARD: AtomicBool = AtomicBool::new(true);
static CAPTURE_MOUSE: AtomicBool = AtomicBool::new(true);
static HUD: OnceLock<Mutex<HudStyleSettings>> = OnceLock::new();

pub const HUD_STYLE_CHANNEL: &str = "cast://hud-style";

fn hud_lock() -> &'static Mutex<HudStyleSettings> {
    HUD.get_or_init(|| Mutex::new(HudStyleSettings::default()))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HudStyleSettings {
    pub font_size_px: u32,
    pub text_color: String,
    pub background_color: String,
    pub background_opacity: f64,
    pub dwell_ms: u32,
}

impl Default for HudStyleSettings {
    fn default() -> Self {
        Self {
            font_size_px: 15,
            text_color: "#f8fafc".into(),
            background_color: "#0f172a".into(),
            background_opacity: 0.82,
            dwell_ms: 1000,
        }
    }
}

impl HudStyleSettings {
    fn clamp(mut self) -> Self {
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
    matches!(rest.len(), 3 | 6)
        && rest.chars().all(|c| c.is_ascii_hexdigit())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
}

impl Default for CaptureSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
        }
    }
}

impl CaptureSettings {
    pub fn from_atomics() -> Self {
        Self {
            capture_keyboard: CAPTURE_KEYBOARD.load(Ordering::Relaxed),
            capture_mouse: CAPTURE_MOUSE.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
    #[serde(default)]
    pub hud: HudStyleSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
            hud: HudStyleSettings::default(),
        }
    }
}

impl AppSettings {
    fn from_runtime() -> Self {
        let hud = hud_lock()
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();
        Self {
            capture_keyboard: CAPTURE_KEYBOARD.load(Ordering::Relaxed),
            capture_mouse: CAPTURE_MOUSE.load(Ordering::Relaxed),
            hud,
        }
    }

    fn apply_runtime(self) {
        CAPTURE_KEYBOARD.store(self.capture_keyboard, Ordering::Relaxed);
        CAPTURE_MOUSE.store(self.capture_mouse, Ordering::Relaxed);
        if let Ok(mut guard) = hud_lock().lock() {
            *guard = self.hud.clamp();
        }
    }
}

/// Whether a reduced chip should be emitted on `cast://event`.
pub fn allows_chip(chip: &HudChip) -> bool {
    match chip {
        HudChip::Key { .. } => CAPTURE_KEYBOARD.load(Ordering::Relaxed),
        HudChip::Mouse { .. } => CAPTURE_MOUSE.load(Ordering::Relaxed),
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|dir| dir.join("settings.json"))
        .map_err(|e| e.to_string())
}

/// Load from disk into runtime (defaults if missing / invalid).
pub fn load(app: &AppHandle) {
    let settings = match settings_path(app) {
        Ok(path) => match fs::read_to_string(&path) {
            Ok(raw) => serde_json::from_str::<AppSettings>(&raw).unwrap_or_default(),
            Err(_) => AppSettings::default(),
        },
        Err(_) => AppSettings::default(),
    };
    settings.apply_runtime();
}

fn save(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

fn emit_hud_style(app: &AppHandle, hud: &HudStyleSettings) {
    let _ = app.emit(HUD_STYLE_CHANNEL, hud);
}

#[tauri::command]
pub fn get_capture_settings() -> CaptureSettings {
    CaptureSettings::from_atomics()
}

#[tauri::command]
pub fn set_capture_settings(
    app: AppHandle,
    settings: CaptureSettings,
) -> Result<CaptureSettings, String> {
    let previous = AppSettings::from_runtime();
    let next = AppSettings {
        capture_keyboard: settings.capture_keyboard,
        capture_mouse: settings.capture_mouse,
        hud: previous.hud.clone(),
    };
    next.clone().apply_runtime();
    if let Err(err) = save(&app, &next) {
        previous.apply_runtime();
        return Err(err);
    }
    Ok(CaptureSettings {
        capture_keyboard: next.capture_keyboard,
        capture_mouse: next.capture_mouse,
    })
}

#[tauri::command]
pub fn get_hud_style_settings() -> HudStyleSettings {
    hud_lock()
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn set_hud_style_settings(
    app: AppHandle,
    settings: HudStyleSettings,
) -> Result<HudStyleSettings, String> {
    let previous = AppSettings::from_runtime();
    let hud = settings.clamp();
    let next = AppSettings {
        capture_keyboard: previous.capture_keyboard,
        capture_mouse: previous.capture_mouse,
        hud: hud.clone(),
    };
    next.clone().apply_runtime();
    if let Err(err) = save(&app, &next) {
        previous.apply_runtime();
        return Err(err);
    }
    emit_hud_style(&app, &hud);
    Ok(hud)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::input::{KeyRef, MouseButton};

    #[test]
    fn defaults_allow_both() {
        CAPTURE_KEYBOARD.store(true, Ordering::Relaxed);
        CAPTURE_MOUSE.store(true, Ordering::Relaxed);
        let key = HudChip::Key {
            mods: vec![],
            key: KeyRef::new("KeyA", "A"),
        };
        let mouse = HudChip::Mouse {
            button: MouseButton::Left,
        };
        assert!(allows_chip(&key));
        assert!(allows_chip(&mouse));
    }

    #[test]
    fn toggling_filters_by_kind() {
        CAPTURE_KEYBOARD.store(false, Ordering::Relaxed);
        CAPTURE_MOUSE.store(true, Ordering::Relaxed);
        let key = HudChip::Key {
            mods: vec![],
            key: KeyRef::new("KeyA", "A"),
        };
        let mouse = HudChip::Mouse {
            button: MouseButton::Left,
        };
        assert!(!allows_chip(&key));
        assert!(allows_chip(&mouse));

        CAPTURE_KEYBOARD.store(true, Ordering::Relaxed);
        CAPTURE_MOUSE.store(false, Ordering::Relaxed);
        assert!(allows_chip(&key));
        assert!(!allows_chip(&mouse));

        CAPTURE_KEYBOARD.store(false, Ordering::Relaxed);
        CAPTURE_MOUSE.store(false, Ordering::Relaxed);
        assert!(!allows_chip(&key));
        assert!(!allows_chip(&mouse));

        CAPTURE_KEYBOARD.store(true, Ordering::Relaxed);
        CAPTURE_MOUSE.store(true, Ordering::Relaxed);
    }

    #[test]
    fn hud_clamp_bounds() {
        let clamped = HudStyleSettings {
            font_size_px: 3,
            text_color: "red".into(),
            background_color: "#0f172a".into(),
            background_opacity: 2.0,
            dwell_ms: 10,
        }
        .clamp();
        assert_eq!(clamped.font_size_px, 10);
        assert_eq!(clamped.dwell_ms, 200);
        assert_eq!(clamped.background_opacity, 1.0);
        assert_eq!(clamped.text_color, "#f8fafc");
    }

    #[test]
    fn app_settings_default_hud_when_missing() {
        let raw = r#"{"captureKeyboard":false,"captureMouse":true}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert!(!parsed.capture_keyboard);
        assert!(parsed.capture_mouse);
        assert_eq!(parsed.hud.dwell_ms, 1000);
    }
}
