//! Runtime locks/atomics, AppSettings load/save/persist.

use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Manager};

use super::types::{
    normalize_ignored_mouse_actions, AppSettings, CaptureSettings, HudPositionSettings,
    HudStyleSettings, UiLocale,
};

pub(crate) static CAPTURE_KEYBOARD: AtomicBool = AtomicBool::new(true);
pub(crate) static CAPTURE_MOUSE: AtomicBool = AtomicBool::new(true);
/// Independent of `capture_mouse` — gates ripple window + emit only.
pub(crate) static MOUSE_CLICK_RIPPLE: AtomicBool = AtomicBool::new(false);
/// Hardware declaration for KeyboardMap numpad column (UI only; does not gate chips).
pub(crate) static HAS_NUMPAD: AtomicBool = AtomicBool::new(false);
pub(crate) static IGNORE_KEY_CAPTURE_ARMED: AtomicBool = AtomicBool::new(false);
pub(crate) static HUD_PLACE_MODE: AtomicBool = AtomicBool::new(false);
static HUD: OnceLock<Mutex<HudStyleSettings>> = OnceLock::new();
static HUD_POSITION: OnceLock<Mutex<HudPositionSettings>> = OnceLock::new();
static IGNORED_KEYS: OnceLock<Mutex<IgnoredKeys>> = OnceLock::new();
static IGNORED_MOUSE: OnceLock<Mutex<IgnoredMouseActions>> = OnceLock::new();
static UI_LOCALE: OnceLock<Mutex<Option<UiLocale>>> = OnceLock::new();

#[derive(Debug, Default)]
pub(crate) struct IgnoredKeys {
    order: Vec<String>,
    set: HashSet<String>,
}

impl IgnoredKeys {
    pub(crate) fn from_ids(ids: Vec<String>) -> Self {
        let order = dedupe_preserve_order(ids);
        let set = order.iter().cloned().collect();
        Self { order, set }
    }

    pub(crate) fn ids(&self) -> Vec<String> {
        self.order.clone()
    }

    pub(crate) fn contains(&self, id: &str) -> bool {
        self.set.contains(id)
    }
}

#[derive(Debug, Default)]
pub(crate) struct IgnoredMouseActions {
    order: Vec<String>,
    set: HashSet<String>,
}

impl IgnoredMouseActions {
    pub(crate) fn from_ids(ids: Vec<String>) -> Self {
        let order = normalize_ignored_mouse_actions(ids);
        let set = order.iter().cloned().collect();
        Self { order, set }
    }

    pub(crate) fn ids(&self) -> Vec<String> {
        self.order.clone()
    }

    pub(crate) fn contains(&self, id: &str) -> bool {
        self.set.contains(id)
    }
}

pub(crate) fn hud_lock() -> &'static Mutex<HudStyleSettings> {
    HUD.get_or_init(|| Mutex::new(HudStyleSettings::default()))
}

pub(crate) fn hud_position_lock() -> &'static Mutex<HudPositionSettings> {
    HUD_POSITION.get_or_init(|| Mutex::new(HudPositionSettings::default()))
}

pub(crate) fn ignored_lock() -> &'static Mutex<IgnoredKeys> {
    IGNORED_KEYS.get_or_init(|| Mutex::new(IgnoredKeys::default()))
}

pub(crate) fn ignored_mouse_lock() -> &'static Mutex<IgnoredMouseActions> {
    IGNORED_MOUSE.get_or_init(|| Mutex::new(IgnoredMouseActions::default()))
}

pub(crate) fn ui_locale_lock() -> &'static Mutex<Option<UiLocale>> {
    UI_LOCALE.get_or_init(|| Mutex::new(None))
}

pub(crate) fn dedupe_preserve_order(ids: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::with_capacity(ids.len());
    for id in ids {
        if id.is_empty() {
            continue;
        }
        if seen.insert(id.clone()) {
            out.push(id);
        }
    }
    out
}

/// Gates `cast://mouse-ripple` emit + ripple window visibility (not HUD chips).
pub fn mouse_click_ripple_enabled() -> bool {
    MOUSE_CLICK_RIPPLE.load(Ordering::Relaxed)
}

impl CaptureSettings {
    pub fn from_runtime() -> Self {
        let ignored_key_ids = ignored_lock()
            .lock()
            .map(|g| g.ids())
            .unwrap_or_default();
        let ignored_mouse_actions = ignored_mouse_lock()
            .lock()
            .map(|g| g.ids())
            .unwrap_or_default();
        Self {
            capture_keyboard: CAPTURE_KEYBOARD.load(Ordering::Relaxed),
            capture_mouse: CAPTURE_MOUSE.load(Ordering::Relaxed),
            mouse_click_ripple: MOUSE_CLICK_RIPPLE.load(Ordering::Relaxed),
            has_numpad: HAS_NUMPAD.load(Ordering::Relaxed),
            ignored_key_ids,
            ignored_mouse_actions,
        }
    }
}

impl AppSettings {
    pub(crate) fn from_runtime() -> Self {
        let hud = hud_lock()
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();
        let hud_position = hud_position_lock()
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();
        let ignored_key_ids = ignored_lock()
            .lock()
            .map(|g| g.ids())
            .unwrap_or_default();
        let ignored_mouse_actions = ignored_mouse_lock()
            .lock()
            .map(|g| g.ids())
            .unwrap_or_default();
        let ui_locale = ui_locale_lock().lock().map(|g| *g).unwrap_or(None);
        Self {
            capture_keyboard: CAPTURE_KEYBOARD.load(Ordering::Relaxed),
            capture_mouse: CAPTURE_MOUSE.load(Ordering::Relaxed),
            mouse_click_ripple: MOUSE_CLICK_RIPPLE.load(Ordering::Relaxed),
            has_numpad: HAS_NUMPAD.load(Ordering::Relaxed),
            ignored_key_ids,
            ignored_mouse_actions,
            hud,
            hud_position,
            ui_locale,
        }
    }

    pub(crate) fn apply_runtime(self) {
        CAPTURE_KEYBOARD.store(self.capture_keyboard, Ordering::Relaxed);
        CAPTURE_MOUSE.store(self.capture_mouse, Ordering::Relaxed);
        MOUSE_CLICK_RIPPLE.store(self.mouse_click_ripple, Ordering::Relaxed);
        HAS_NUMPAD.store(self.has_numpad, Ordering::Relaxed);
        if let Ok(mut guard) = ignored_lock().lock() {
            *guard = IgnoredKeys::from_ids(self.ignored_key_ids);
        }
        if let Ok(mut guard) = ignored_mouse_lock().lock() {
            *guard = IgnoredMouseActions::from_ids(self.ignored_mouse_actions);
        }
        if let Ok(mut guard) = hud_lock().lock() {
            *guard = self.hud.clamp();
        }
        if let Ok(mut guard) = hud_position_lock().lock() {
            *guard = self.hud_position;
        }
        if let Ok(mut guard) = ui_locale_lock().lock() {
            *guard = self.ui_locale;
        }
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

pub(crate) fn persist_app_settings(app: &AppHandle, next: AppSettings) -> Result<AppSettings, String> {
    let previous = AppSettings::from_runtime();
    next.clone().apply_runtime();
    if let Err(err) = save(app, &next) {
        previous.apply_runtime();
        return Err(err);
    }
    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupe_preserves_order() {
        let ids = dedupe_preserve_order(vec![
            "KeyA".into(),
            "KeyB".into(),
            "KeyA".into(),
            "".into(),
            "KeyC".into(),
        ]);
        assert_eq!(ids, vec!["KeyA", "KeyB", "KeyC"]);
    }
}
