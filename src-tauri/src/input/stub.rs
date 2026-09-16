use tauri::{AppHandle, Emitter};

use super::event::{HookStatus, HOOK_STATUS_CHANNEL};

/// Non-macOS / non-Windows placeholder — keeps the module boundary.
pub fn start(app: AppHandle) {
    eprintln!("[z-key-cast] input hooks are not implemented on this platform");
    let _ = app.emit(
        HOOK_STATUS_CHANNEL,
        HookStatus::denied("unsupported_platform"),
    );
}
