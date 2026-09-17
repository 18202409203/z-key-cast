//! HUD style + position + place-mode commands/helpers.

use std::sync::atomic::Ordering;

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

use super::store::{
    hud_lock, hud_position_lock, persist_app_settings, HUD_PLACE_MODE,
};
use super::types::{
    AppSettings, HudCorner, HudPlaceModePayload, HudPositionSettings, HudStyleSettings,
};
use super::{HUD_PLACE_MODE_CHANNEL, HUD_STYLE_CHANNEL};

fn emit_hud_style(app: &AppHandle, hud: &HudStyleSettings) {
    let _ = app.emit(HUD_STYLE_CHANNEL, hud);
}

fn emit_hud_place_mode(app: &AppHandle, active: bool) {
    let _ = app.emit(HUD_PLACE_MODE_CHANNEL, HudPlaceModePayload { active });
}

pub(crate) fn corner_position(
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
        mouse_click_ripple: previous.mouse_click_ripple,
        has_numpad: previous.has_numpad,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        ignored_mouse_actions: previous.ignored_mouse_actions.clone(),
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
        mouse_click_ripple: previous.mouse_click_ripple,
        has_numpad: previous.has_numpad,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        ignored_mouse_actions: previous.ignored_mouse_actions.clone(),
        hud: previous.hud.clone(),
        hud_position: settings.clone(),
        ui_locale: previous.ui_locale,
    };
    persist_app_settings(&app, next)?;
    apply_hud_position(&app);
    Ok(settings)
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
        mouse_click_ripple: previous.mouse_click_ripple,
        has_numpad: previous.has_numpad,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        ignored_mouse_actions: previous.ignored_mouse_actions.clone(),
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
