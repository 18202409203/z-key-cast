//! Durable capture toggles (keyboard / mouse) with immediate hot-path apply.

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::input::HudChip;

static CAPTURE_KEYBOARD: AtomicBool = AtomicBool::new(true);
static CAPTURE_MOUSE: AtomicBool = AtomicBool::new(true);

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
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

    fn apply_atomics(self) {
        CAPTURE_KEYBOARD.store(self.capture_keyboard, Ordering::Relaxed);
        CAPTURE_MOUSE.store(self.capture_mouse, Ordering::Relaxed);
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

/// Load from disk into atomics (defaults if missing / invalid).
pub fn load(app: &AppHandle) {
    let settings = match settings_path(app) {
        Ok(path) => match fs::read_to_string(&path) {
            Ok(raw) => serde_json::from_str::<CaptureSettings>(&raw).unwrap_or_default(),
            Err(_) => CaptureSettings::default(),
        },
        Err(_) => CaptureSettings::default(),
    };
    settings.apply_atomics();
}

fn save(app: &AppHandle, settings: &CaptureSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
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
    let previous = CaptureSettings::from_atomics();
    settings.apply_atomics();
    if let Err(err) = save(&app, &settings) {
        previous.apply_atomics();
        return Err(err);
    }
    Ok(settings)
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

        // Restore defaults for other tests in the same process.
        CAPTURE_KEYBOARD.store(true, Ordering::Relaxed);
        CAPTURE_MOUSE.store(true, Ordering::Relaxed);
    }
}
