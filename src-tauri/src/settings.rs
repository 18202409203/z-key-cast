//! Durable app settings: capture toggles + HUD appearance + position + ignored keys.

use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

use crate::input::HudChip;

static CAPTURE_KEYBOARD: AtomicBool = AtomicBool::new(true);
static CAPTURE_MOUSE: AtomicBool = AtomicBool::new(true);
static IGNORE_KEY_CAPTURE_ARMED: AtomicBool = AtomicBool::new(false);
static HUD_PLACE_MODE: AtomicBool = AtomicBool::new(false);
static HUD: OnceLock<Mutex<HudStyleSettings>> = OnceLock::new();
static HUD_POSITION: OnceLock<Mutex<HudPositionSettings>> = OnceLock::new();
static IGNORED_KEYS: OnceLock<Mutex<IgnoredKeys>> = OnceLock::new();
static UI_LOCALE: OnceLock<Mutex<Option<UiLocale>>> = OnceLock::new();

pub const HUD_STYLE_CHANNEL: &str = "cast://hud-style";
pub const HUD_PLACE_MODE_CHANNEL: &str = "cast://hud-place-mode";
pub const UI_LOCALE_CHANNEL: &str = "cast://ui-locale";

#[derive(Debug, Default)]
struct IgnoredKeys {
    order: Vec<String>,
    set: HashSet<String>,
}

impl IgnoredKeys {
    fn from_ids(ids: Vec<String>) -> Self {
        let order = dedupe_preserve_order(ids);
        let set = order.iter().cloned().collect();
        Self { order, set }
    }

    fn ids(&self) -> Vec<String> {
        self.order.clone()
    }

    fn contains(&self, id: &str) -> bool {
        self.set.contains(id)
    }
}

fn hud_lock() -> &'static Mutex<HudStyleSettings> {
    HUD.get_or_init(|| Mutex::new(HudStyleSettings::default()))
}

fn hud_position_lock() -> &'static Mutex<HudPositionSettings> {
    HUD_POSITION.get_or_init(|| Mutex::new(HudPositionSettings::default()))
}

fn ignored_lock() -> &'static Mutex<IgnoredKeys> {
    IGNORED_KEYS.get_or_init(|| Mutex::new(IgnoredKeys::default()))
}

fn ui_locale_lock() -> &'static Mutex<Option<UiLocale>> {
    UI_LOCALE.get_or_init(|| Mutex::new(None))
}

fn dedupe_preserve_order(ids: Vec<String>) -> Vec<String> {
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum KeyboardDisplayMode {
    Text,
    KeyCard,
    Keyboard,
}

impl Default for KeyboardDisplayMode {
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
pub enum MouseDisplayMode {
    Text,
    Schematic,
}

impl Default for MouseDisplayMode {
    fn default() -> Self {
        Self::Text
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HudStyleSettings {
    pub font_size_px: u32,
    pub text_color: String,
    pub background_color: String,
    pub background_opacity: f64,
    pub dwell_ms: u32,
    #[serde(default)]
    pub keyboard_display_mode: KeyboardDisplayMode,
    #[serde(default)]
    pub keyboard_legend_layout: KeyboardLegendLayout,
    #[serde(default)]
    pub mouse_display_mode: MouseDisplayMode,
}

impl Default for HudStyleSettings {
    fn default() -> Self {
        Self {
            font_size_px: 15,
            text_color: "#f8fafc".into(),
            background_color: "#0f172a".into(),
            background_opacity: 0.82,
            dwell_ms: 1000,
            keyboard_display_mode: KeyboardDisplayMode::Text,
            keyboard_legend_layout: KeyboardLegendLayout::Auto,
            mouse_display_mode: MouseDisplayMode::Text,
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
    #[serde(default)]
    pub ignored_key_ids: Vec<String>,
}

impl Default for CaptureSettings {
    fn default() -> Self {
        Self {
            capture_keyboard: true,
            capture_mouse: true,
            ignored_key_ids: Vec::new(),
        }
    }
}

impl CaptureSettings {
    pub fn from_runtime() -> Self {
        let ignored_key_ids = ignored_lock()
            .lock()
            .map(|g| g.ids())
            .unwrap_or_default();
        Self {
            capture_keyboard: CAPTURE_KEYBOARD.load(Ordering::Relaxed),
            capture_mouse: CAPTURE_MOUSE.load(Ordering::Relaxed),
            ignored_key_ids,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub capture_keyboard: bool,
    pub capture_mouse: bool,
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
            ignored_key_ids: Vec::new(),
            hud: HudStyleSettings::default(),
            hud_position: HudPositionSettings::default(),
            ui_locale: None,
        }
    }
}

impl AppSettings {
    fn from_runtime() -> Self {
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
        let ui_locale = ui_locale_lock()
            .lock()
            .map(|g| *g)
            .unwrap_or(None);
        Self {
            capture_keyboard: CAPTURE_KEYBOARD.load(Ordering::Relaxed),
            capture_mouse: CAPTURE_MOUSE.load(Ordering::Relaxed),
            ignored_key_ids,
            hud,
            hud_position,
            ui_locale,
        }
    }

    fn apply_runtime(self) {
        CAPTURE_KEYBOARD.store(self.capture_keyboard, Ordering::Relaxed);
        CAPTURE_MOUSE.store(self.capture_mouse, Ordering::Relaxed);
        if let Ok(mut guard) = ignored_lock().lock() {
            *guard = IgnoredKeys::from_ids(self.ignored_key_ids);
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

/// Whether a reduced chip should be emitted on `cast://event`.
pub fn allows_chip(chip: &HudChip) -> bool {
    match chip {
        HudChip::Key { .. } => CAPTURE_KEYBOARD.load(Ordering::Relaxed),
        HudChip::Mouse { .. } => CAPTURE_MOUSE.load(Ordering::Relaxed),
    }
}

/// Drop key chips whose primary id is ignored; strip ignored mods. Mouse unchanged.
pub fn filter_key_chip(chip: HudChip) -> Option<HudChip> {
    match chip {
        HudChip::Mouse { .. } => Some(chip),
        HudChip::Key { mods, key } => {
            let ignored = ignored_lock().lock().ok();
            let is_ignored = |id: &str| {
                ignored
                    .as_ref()
                    .map(|g| g.contains(id))
                    .unwrap_or(false)
            };
            if is_ignored(&key.id) {
                return None;
            }
            let mods = mods
                .into_iter()
                .filter(|m| !is_ignored(&m.id))
                .collect();
            Some(HudChip::Key { mods, key })
        }
    }
}

/// Arm capture of the next key/mod down for the ignore list.
pub fn arm_ignore_capture() {
    IGNORE_KEY_CAPTURE_ARMED.store(true, Ordering::SeqCst);
}

/// Disarm without adding a key.
pub fn cancel_ignore_capture() {
    IGNORE_KEY_CAPTURE_ARMED.store(false, Ordering::SeqCst);
}

/// If armed, disarm and return true (caller should suppress `cast://event`).
pub fn take_ignore_capture() -> bool {
    IGNORE_KEY_CAPTURE_ARMED.swap(false, Ordering::SeqCst)
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

fn emit_hud_place_mode(app: &AppHandle, active: bool) {
    let _ = app.emit(
        HUD_PLACE_MODE_CHANNEL,
        HudPlaceModePayload { active },
    );
}

fn emit_ui_locale(app: &AppHandle, locale: UiLocale) {
    let _ = app.emit(UI_LOCALE_CHANNEL, UiLocalePayload { locale });
}

fn corner_position(
    corner: HudCorner,
    screen_w: i32,
    screen_h: i32,
    win_w: i32,
    win_h: i32,
    margin_x: i32,
    margin_y: i32,
) -> (i32, i32) {
    match corner {
        HudCorner::Br => (screen_w - win_w - margin_x, screen_h - win_h - margin_y),
        HudCorner::Bl => (margin_x, screen_h - win_h - margin_y),
        HudCorner::Tr => (screen_w - win_w - margin_x, margin_y),
        HudCorner::Tl => (margin_x, margin_y),
    }
}

/// Position the overlay window from the current HUD position settings.
pub fn apply_hud_position(app: &AppHandle) {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return;
    };
    let position = hud_position_lock()
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default();

    match position {
        HudPositionSettings::Custom { x, y } => {
            let _ = overlay.set_position(PhysicalPosition::new(x, y));
        }
        HudPositionSettings::Corner { corner } => {
            let Ok(Some(monitor)) = overlay.current_monitor() else {
                return;
            };
            let screen = monitor.size();
            let scale = monitor.scale_factor();
            let Ok(size) = overlay.outer_size() else {
                return;
            };
            let margin_x = (24.0 * scale) as i32;
            let margin_y = (48.0 * scale) as i32;
            let (x, y) = corner_position(
                corner,
                screen.width as i32,
                screen.height as i32,
                size.width as i32,
                size.height as i32,
                margin_x,
                margin_y,
            );
            let _ = overlay.set_position(PhysicalPosition::new(x, y));
        }
    }
}

fn persist_app_settings(app: &AppHandle, next: AppSettings) -> Result<AppSettings, String> {
    let previous = AppSettings::from_runtime();
    next.clone().apply_runtime();
    if let Err(err) = save(app, &next) {
        previous.apply_runtime();
        return Err(err);
    }
    Ok(next)
}

#[tauri::command]
pub fn get_capture_settings() -> CaptureSettings {
    CaptureSettings::from_runtime()
}

#[tauri::command]
pub fn set_capture_settings(
    app: AppHandle,
    settings: CaptureSettings,
) -> Result<CaptureSettings, String> {
    let previous = AppSettings::from_runtime();
    let ignored_key_ids = dedupe_preserve_order(settings.ignored_key_ids);
    let next = AppSettings {
        capture_keyboard: settings.capture_keyboard,
        capture_mouse: settings.capture_mouse,
        ignored_key_ids: ignored_key_ids.clone(),
        hud: previous.hud.clone(),
        hud_position: previous.hud_position.clone(),
        ui_locale: previous.ui_locale,
    };
    persist_app_settings(&app, next)?;
    Ok(CaptureSettings {
        capture_keyboard: settings.capture_keyboard,
        capture_mouse: settings.capture_mouse,
        ignored_key_ids,
    })
}

#[tauri::command]
pub fn arm_ignore_key_capture() {
    arm_ignore_capture();
}

#[tauri::command]
pub fn cancel_ignore_key_capture() {
    cancel_ignore_capture();
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
        ignored_key_ids: previous.ignored_key_ids.clone(),
        hud: hud.clone(),
        hud_position: previous.hud_position.clone(),
        ui_locale: previous.ui_locale,
    };
    persist_app_settings(&app, next)?;
    emit_hud_style(&app, &hud);
    Ok(hud)
}

#[tauri::command]
pub fn get_hud_position_settings() -> HudPositionSettings {
    hud_position_lock()
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn set_hud_position_settings(
    app: AppHandle,
    settings: HudPositionSettings,
) -> Result<HudPositionSettings, String> {
    let previous = AppSettings::from_runtime();
    let next = AppSettings {
        capture_keyboard: previous.capture_keyboard,
        capture_mouse: previous.capture_mouse,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        hud: previous.hud.clone(),
        hud_position: settings.clone(),
        ui_locale: previous.ui_locale,
    };
    persist_app_settings(&app, next)?;
    apply_hud_position(&app);
    Ok(settings)
}

#[tauri::command]
pub fn get_ui_locale_settings() -> Option<UiLocale> {
    ui_locale_lock()
        .lock()
        .map(|g| *g)
        .unwrap_or(None)
}

#[tauri::command]
pub fn set_ui_locale_settings(
    app: AppHandle,
    locale: UiLocale,
) -> Result<UiLocale, String> {
    let previous = AppSettings::from_runtime();
    let next = AppSettings {
        capture_keyboard: previous.capture_keyboard,
        capture_mouse: previous.capture_mouse,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        hud: previous.hud.clone(),
        hud_position: previous.hud_position.clone(),
        ui_locale: Some(locale),
    };
    persist_app_settings(&app, next)?;
    emit_ui_locale(&app, locale);
    Ok(locale)
}

#[tauri::command]
pub fn start_hud_place_mode(app: AppHandle) -> Result<(), String> {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return Err("overlay window not found".into());
    };
    overlay
        .set_ignore_cursor_events(false)
        .map_err(|e| e.to_string())?;
    HUD_PLACE_MODE.store(true, Ordering::SeqCst);
    emit_hud_place_mode(&app, true);
    Ok(())
}

/// Leave place mode without persisting the in-progress drag (Done-only exit).
/// Restores click-through and snaps the overlay back to persisted settings.
/// Idempotent — safe on app quit / main-window close.
pub fn abandon_hud_place_mode(app: &AppHandle) {
    let was_placing = HUD_PLACE_MODE.swap(false, Ordering::SeqCst);
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.set_ignore_cursor_events(true);
    }
    if !was_placing {
        return;
    }
    emit_hud_place_mode(app, false);
    apply_hud_position(app);
}

#[tauri::command]
pub fn end_hud_place_mode(app: AppHandle) -> Result<HudPositionSettings, String> {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return Err("overlay window not found".into());
    };

    let outer = overlay.outer_position().map_err(|e| e.to_string())?;
    let custom = HudPositionSettings::Custom {
        x: outer.x,
        y: outer.y,
    };

    let previous = AppSettings::from_runtime();
    let next = AppSettings {
        capture_keyboard: previous.capture_keyboard,
        capture_mouse: previous.capture_mouse,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        hud: previous.hud.clone(),
        hud_position: custom.clone(),
        ui_locale: previous.ui_locale,
    };

    if let Err(err) = persist_app_settings(&app, next) {
        // Persist failed — still leave place mode so click-through is not stuck off.
        abandon_hud_place_mode(&app);
        return Err(err);
    }

    // Position is saved; always leave place mode even if ignore-cursor restore flakes.
    HUD_PLACE_MODE.store(false, Ordering::SeqCst);
    emit_hud_place_mode(&app, false);
    let _ = overlay.set_ignore_cursor_events(true);
    Ok(custom)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::input::{KeyRef, MouseButton};

    fn set_ignored(ids: &[&str]) {
        if let Ok(mut guard) = ignored_lock().lock() {
            *guard = IgnoredKeys::from_ids(ids.iter().map(|s| (*s).to_string()).collect());
        }
    }

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
    fn filter_drops_ignored_primary() {
        set_ignored(&["KeyA"]);
        let chip = HudChip::Key {
            mods: vec![KeyRef::new("MetaLeft", "⌘")],
            key: KeyRef::new("KeyA", "A"),
        };
        assert!(filter_key_chip(chip).is_none());
        set_ignored(&[]);
    }

    #[test]
    fn filter_strips_ignored_mods() {
        set_ignored(&["MetaLeft"]);
        let chip = HudChip::Key {
            mods: vec![
                KeyRef::new("MetaLeft", "⌘"),
                KeyRef::new("ShiftLeft", "⇧"),
            ],
            key: KeyRef::new("KeyS", "S"),
        };
        let filtered = filter_key_chip(chip).expect("primary kept");
        match filtered {
            HudChip::Key { mods, key } => {
                assert_eq!(key.id, "KeyS");
                assert_eq!(mods.len(), 1);
                assert_eq!(mods[0].id, "ShiftLeft");
            }
            HudChip::Mouse { .. } => panic!("expected key chip"),
        }
        set_ignored(&[]);
    }

    #[test]
    fn filter_empty_ignore_passes_through() {
        set_ignored(&[]);
        let chip = HudChip::Key {
            mods: vec![KeyRef::new("MetaLeft", "⌘")],
            key: KeyRef::new("KeyA", "A"),
        };
        let filtered = filter_key_chip(chip).expect("kept");
        match filtered {
            HudChip::Key { mods, key } => {
                assert_eq!(key.id, "KeyA");
                assert_eq!(mods.len(), 1);
            }
            HudChip::Mouse { .. } => panic!("expected key chip"),
        }
    }

    #[test]
    fn filter_mouse_unaffected() {
        set_ignored(&["KeyA", "MetaLeft"]);
        let mouse = HudChip::Mouse {
            button: MouseButton::Left,
        };
        assert!(matches!(
            filter_key_chip(mouse),
            Some(HudChip::Mouse {
                button: MouseButton::Left
            })
        ));
        set_ignored(&[]);
    }

    #[test]
    fn ignore_capture_arm_take_cancel() {
        cancel_ignore_capture();
        assert!(!IGNORE_KEY_CAPTURE_ARMED.load(Ordering::SeqCst));
        arm_ignore_capture();
        assert!(IGNORE_KEY_CAPTURE_ARMED.load(Ordering::SeqCst));
        assert!(take_ignore_capture());
        assert!(!IGNORE_KEY_CAPTURE_ARMED.load(Ordering::SeqCst));
        assert!(!take_ignore_capture());

        arm_ignore_capture();
        cancel_ignore_capture();
        assert!(!IGNORE_KEY_CAPTURE_ARMED.load(Ordering::SeqCst));
        assert!(!take_ignore_capture());
    }

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

    #[test]
    fn hud_clamp_bounds() {
        let clamped = HudStyleSettings {
            font_size_px: 3,
            text_color: "red".into(),
            background_color: "#0f172a".into(),
            background_opacity: 2.0,
            dwell_ms: 10,
            keyboard_display_mode: KeyboardDisplayMode::Text,
            keyboard_legend_layout: KeyboardLegendLayout::Auto,
            mouse_display_mode: MouseDisplayMode::Text,
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
        assert!(parsed.ignored_key_ids.is_empty());
        assert_eq!(parsed.hud.dwell_ms, 1000);
        assert_eq!(
            parsed.hud_position,
            HudPositionSettings::Corner {
                corner: HudCorner::Br
            }
        );
        assert_eq!(parsed.ui_locale, None);
    }

    #[test]
    fn app_settings_parses_ui_locale() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true,"uiLocale":"zh"}"#;
        let parsed: AppSettings = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.ui_locale, Some(UiLocale::Zh));
    }

    #[test]
    fn app_settings_parses_ignored_key_ids() {
        let raw = r#"{"captureKeyboard":true,"captureMouse":true,"ignoredKeyIds":["KeyA","Escape"]}"#;
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

    #[test]
    fn corner_position_math() {
        assert_eq!(
            corner_position(HudCorner::Br, 1920, 1080, 200, 100, 24, 48),
            (1696, 932)
        );
        assert_eq!(
            corner_position(HudCorner::Bl, 1920, 1080, 200, 100, 24, 48),
            (24, 932)
        );
        assert_eq!(
            corner_position(HudCorner::Tr, 1920, 1080, 200, 100, 24, 48),
            (1696, 48)
        );
        assert_eq!(
            corner_position(HudCorner::Tl, 1920, 1080, 200, 100, 24, 48),
            (24, 48)
        );
    }
}
