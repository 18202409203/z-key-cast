mod chip;
mod event;
mod filter;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod stub;

#[allow(unused_imports)]
pub use event::{
    HookStatus, HudChip, KeyRef, MouseButton, MouseRippleEvent, Phase, EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL, IGNORE_KEY_CAPTURED_CHANNEL, MOUSE_RIPPLE_CHANNEL,
};

use tauri::AppHandle;

/// Start the platform input hook (macOS CGEventTap; Windows LL hooks; stub elsewhere).
pub fn start(app: AppHandle) {
    #[cfg(target_os = "macos")]
    macos::start(app);

    #[cfg(target_os = "windows")]
    windows::start(app);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    stub::start(app);
}
