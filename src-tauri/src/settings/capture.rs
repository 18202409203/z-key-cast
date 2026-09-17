//! Capture toggles, ignored keys, chip gate helpers, ignore-arm commands.

use std::sync::atomic::Ordering;

use tauri::{AppHandle, Emitter};

use crate::input::HudChip;

use super::ripple;
use super::store::{
    dedupe_preserve_order, ignored_lock, persist_app_settings, CAPTURE_KEYBOARD, CAPTURE_MOUSE,
    IGNORE_KEY_CAPTURE_ARMED,
};
use super::types::{AppSettings, CaptureSettings};
use super::CAPTURE_SETTINGS_CHANNEL;

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
        HudChip::Key { mods, key, phase } => {
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
            let mods = mods.into_iter().filter(|m| !is_ignored(&m.id)).collect();
            Some(HudChip::Key { mods, key, phase })
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

#[tauri::command]
pub fn get_capture_settings() -> CaptureSettings {
    CaptureSettings::from_runtime()
}

fn emit_capture_settings(app: &AppHandle, settings: &CaptureSettings) {
    let _ = app.emit(CAPTURE_SETTINGS_CHANNEL, settings);
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
        mouse_click_ripple: settings.mouse_click_ripple,
        has_numpad: settings.has_numpad,
        ignored_key_ids: ignored_key_ids.clone(),
        hud: previous.hud.clone(),
        hud_position: previous.hud_position.clone(),
        ui_locale: previous.ui_locale,
    };
    persist_app_settings(&app, next)?;
    ripple::sync_ripple_window(&app);
    let saved = CaptureSettings {
        capture_keyboard: settings.capture_keyboard,
        capture_mouse: settings.capture_mouse,
        mouse_click_ripple: settings.mouse_click_ripple,
        has_numpad: settings.has_numpad,
        ignored_key_ids,
    };
    emit_capture_settings(&app, &saved);
    Ok(saved)
}

#[tauri::command]
pub fn arm_ignore_key_capture() {
    arm_ignore_capture();
}

#[tauri::command]
pub fn cancel_ignore_key_capture() {
    cancel_ignore_capture();
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::input::{KeyRef, MouseButton};
    use crate::settings::store::{
        mouse_click_ripple_enabled, IgnoredKeys, MOUSE_CLICK_RIPPLE,
    };

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
            key: KeyRef::new("KeyA"),
            phase: crate::input::Phase::Down,
        };
        let mouse = HudChip::Mouse {
            button: MouseButton::Left,
            phase: crate::input::Phase::Down,
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
            key: KeyRef::new("KeyA"),
            phase: crate::input::Phase::Down,
        };
        let mouse = HudChip::Mouse {
            button: MouseButton::Left,
            phase: crate::input::Phase::Down,
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
    fn mouse_click_ripple_does_not_gate_mouse_chips() {
        let mouse = HudChip::Mouse {
            button: MouseButton::Left,
            phase: crate::input::Phase::Down,
        };

        CAPTURE_MOUSE.store(false, Ordering::Relaxed);
        MOUSE_CLICK_RIPPLE.store(true, Ordering::Relaxed);
        assert!(!allows_chip(&mouse));
        assert!(mouse_click_ripple_enabled());

        CAPTURE_MOUSE.store(true, Ordering::Relaxed);
        MOUSE_CLICK_RIPPLE.store(false, Ordering::Relaxed);
        assert!(allows_chip(&mouse));
        assert!(!mouse_click_ripple_enabled());

        CAPTURE_MOUSE.store(true, Ordering::Relaxed);
        MOUSE_CLICK_RIPPLE.store(false, Ordering::Relaxed);
    }

    #[test]
    fn filter_drops_ignored_primary() {
        set_ignored(&["KeyA"]);
        let chip = HudChip::Key {
            mods: vec![KeyRef::new("MetaLeft")],
            key: KeyRef::new("KeyA"),
            phase: crate::input::Phase::Down,
        };
        assert!(filter_key_chip(chip).is_none());
        set_ignored(&[]);
    }

    #[test]
    fn filter_strips_ignored_mods() {
        set_ignored(&["MetaLeft"]);
        let chip = HudChip::Key {
            mods: vec![KeyRef::new("MetaLeft"), KeyRef::new("ShiftLeft")],
            key: KeyRef::new("KeyS"),
            phase: crate::input::Phase::Down,
        };
        let filtered = filter_key_chip(chip).expect("primary kept");
        match filtered {
            HudChip::Key { mods, key, phase } => {
                assert_eq!(key.id, "KeyS");
                assert_eq!(mods.len(), 1);
                assert_eq!(mods[0].id, "ShiftLeft");
                assert_eq!(phase, crate::input::Phase::Down);
            }
            HudChip::Mouse { .. } => panic!("expected key chip"),
        }
        set_ignored(&[]);
    }

    #[test]
    fn filter_empty_ignore_passes_through() {
        set_ignored(&[]);
        let chip = HudChip::Key {
            mods: vec![KeyRef::new("MetaLeft")],
            key: KeyRef::new("KeyA"),
            phase: crate::input::Phase::Down,
        };
        let filtered = filter_key_chip(chip).expect("kept");
        match filtered {
            HudChip::Key { mods, key, .. } => {
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
            phase: crate::input::Phase::Down,
        };
        assert!(matches!(
            filter_key_chip(mouse),
            Some(HudChip::Mouse {
                button: MouseButton::Left,
                phase: crate::input::Phase::Down,
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
}
