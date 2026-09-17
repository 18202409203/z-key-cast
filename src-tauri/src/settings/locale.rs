//! UI locale get/set + emit.

use tauri::{AppHandle, Emitter};

use super::store::{persist_app_settings, ui_locale_lock};
use super::types::{AppSettings, UiLocale, UiLocalePayload};
use super::UI_LOCALE_CHANNEL;

fn emit_ui_locale(app: &AppHandle, locale: UiLocale) {
    let _ = app.emit(UI_LOCALE_CHANNEL, UiLocalePayload { locale });
}

#[tauri::command]
pub fn get_ui_locale_settings() -> Option<UiLocale> {
    ui_locale_lock().lock().map(|g| *g).unwrap_or(None)
}

#[tauri::command]
pub fn set_ui_locale_settings(app: AppHandle, locale: UiLocale) -> Result<UiLocale, String> {
    let previous = AppSettings::from_runtime();
    let next = AppSettings {
        capture_keyboard: previous.capture_keyboard,
        capture_mouse: previous.capture_mouse,
        mouse_click_ripple: previous.mouse_click_ripple,
        ignored_key_ids: previous.ignored_key_ids.clone(),
        hud: previous.hud.clone(),
        hud_position: previous.hud_position.clone(),
        ui_locale: Some(locale),
    };
    persist_app_settings(&app, next)?;
    emit_ui_locale(&app, locale);
    Ok(locale)
}
