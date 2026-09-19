//! Keep HUD layers from stealing keyboard focus from Main.

use std::sync::atomic::Ordering;

use tauri::{AppHandle, Manager, WebviewWindow};

use super::store::HUD_PLACE_MODE;
use super::RIPPLE_WINDOW_LABEL;

/// Overlay + ripple must not become the key window while Settings is in use.
pub fn harden_hud_layers(app: &AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        set_overlay_focusable(&overlay, HUD_PLACE_MODE.load(Ordering::SeqCst));
    }
    if let Some(ripple) = app.get_webview_window(RIPPLE_WINDOW_LABEL) {
        let _ = ripple.set_focusable(false);
    }
}

pub fn set_overlay_focusable(overlay: &WebviewWindow, focusable: bool) {
    let _ = overlay.set_focusable(focusable);
}

/// If a HUD layer somehow becomes focused outside place-mode, bounce focus to Main.
pub fn on_hud_layer_focused(app: &AppHandle, label: &str) {
    if label != "overlay" && label != RIPPLE_WINDOW_LABEL {
        return;
    }
    if label == "overlay" && HUD_PLACE_MODE.load(Ordering::SeqCst) {
        return;
    }
    if let Some(win) = app.get_webview_window(label) {
        let _ = win.set_focusable(false);
    }
    reclaim_main_focus(app);
}

pub fn reclaim_main_focus(app: &AppHandle) {
    if HUD_PLACE_MODE.load(Ordering::SeqCst) {
        return;
    }
    let Some(main) = app.get_webview_window("main") else {
        return;
    };
    if main.is_visible().unwrap_or(false) {
        let _ = main.set_focus();
    }
}
