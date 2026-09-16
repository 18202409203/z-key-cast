mod chip;
mod event;
mod filter;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(not(target_os = "macos"))]
mod stub;

#[allow(unused_imports)]
pub use event::{
    HookStatus, HudChip, KeyRef, MouseButton, MouseRippleEvent, Phase, EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL, IGNORE_KEY_CAPTURED_CHANNEL, MOUSE_RIPPLE_CHANNEL,
};

use tauri::AppHandle;

/// Start the platform input hook (macOS CGEventTap; stub elsewhere).
pub fn start(app: AppHandle) {
    #[cfg(target_os = "macos")]
    macos::start(app);

    #[cfg(not(target_os = "macos"))]
    stub::start(app);
}
