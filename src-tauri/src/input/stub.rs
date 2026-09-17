use tauri::AppHandle;

use super::emit_hook_status;
use super::event::HookStatus;

/// Non-macOS / non-Windows placeholder — keeps the module boundary.
pub fn start(app: AppHandle) {
    eprintln!("[z-key-cast] input hooks are not implemented on this platform");
    emit_hook_status(&app, HookStatus::denied("unsupported_platform"));
}
