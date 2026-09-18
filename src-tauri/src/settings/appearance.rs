//! UI appearance get/set + emit.

use tauri::{AppHandle, Emitter};

use super::store::{persist_app_settings, ui_appearance_lock};
use super::types::{AppSettings, UiAppearance, UiAppearancePayload};
use super::UI_APPEARANCE_CHANNEL;

fn emit_ui_appearance(app: &AppHandle, appearance: UiAppearance) {
    let _ = app.emit(UI_APPEARANCE_CHANNEL, UiAppearancePayload { appearance });
}

#[tauri::command]
pub fn get_ui_appearance_settings() -> Option<UiAppearance> {
    ui_appearance_lock().lock().map(|g| *g).unwrap_or(None)
}

#[tauri::command]
pub fn set_ui_appearance_settings(
    app: AppHandle,
    appearance: UiAppearance,
) -> Result<UiAppearance, String> {
    let previous = AppSettings::from_runtime();
    let next = AppSettings {
        capture_keyboard: previous.capture_keyboard,
        capture_mouse: previous.capture_mouse,
        mouse_click_ripple: previous.mouse_click_ripple,
        has_numpad: previous.has_numpad,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        ignored_mouse_actions: previous.ignored_mouse_actions.clone(),
        hud: previous.hud.clone(),
        hud_position: previous.hud_position.clone(),
        ui_locale: previous.ui_locale,
        ui_appearance: Some(appearance),
    };
    persist_app_settings(&app, next)?;
    emit_ui_appearance(&app, appearance);
    Ok(appearance)
}
