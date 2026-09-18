mod chip;
mod event;
mod filter;
mod ripple_coords;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod stub;

#[allow(unused_imports)]
pub use event::{
    HookStatus, HudChip, KeyRef, MouseButton, MouseRippleEvent, Phase, ScrollDirection,
    EVENT_CHANNEL, HOOK_STATUS_CHANNEL, IGNORE_KEY_CAPTURED_CHANNEL, MOUSE_RIPPLE_CHANNEL,
};

use std::sync::Mutex;

use tauri::{AppHandle, Emitter};

/// Last emitted hook status — webviews that subscribe late (HMR / slow load) can query it.
static LAST_HOOK_STATUS: Mutex<Option<HookStatus>> = Mutex::new(None);

/// Persist then broadcast so Settings/Overlay can catch up after a missed one-shot emit.
pub(crate) fn emit_hook_status(app: &AppHandle, status: HookStatus) {
    if let Ok(mut guard) = LAST_HOOK_STATUS.lock() {
        *guard = Some(status.clone());
    }
    let _ = app.emit(HOOK_STATUS_CHANNEL, status);
}

#[tauri::command]
pub fn get_hook_status() -> Option<HookStatus> {
    LAST_HOOK_STATUS
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
}

/// Start the platform input hook (macOS CGEventTap; Windows LL hooks; stub elsewhere).
pub fn start(app: AppHandle) {
    #[cfg(target_os = "macos")]
    macos::start(app);

    #[cfg(target_os = "windows")]
    windows::start(app);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    stub::start(app);
}
