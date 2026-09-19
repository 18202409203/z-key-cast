//! Sync/ensure ripple window from `mouseClickRipple`.

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

use super::store::mouse_click_ripple_enabled;
use super::RIPPLE_WINDOW_LABEL;

/// Lazy-create / show or hide the primary-monitor ripple layer from `mouseClickRipple`.
pub fn sync_ripple_window(app: &AppHandle) {
    if mouse_click_ripple_enabled() {
        ensure_ripple_window(app);
    } else if let Some(win) = app.get_webview_window(RIPPLE_WINDOW_LABEL) {
        let _ = win.hide();
    }
}

fn ensure_ripple_window(app: &AppHandle) {
    let Ok(Some(monitor)) = app.primary_monitor() else {
        eprintln!("[z-key-cast] ripple: primary monitor unavailable");
        return;
    };
    let pos = *monitor.position();
    let size = *monitor.size();
    let scale = monitor.scale_factor();
    let logical_w = size.width as f64 / scale;
    let logical_h = size.height as f64 / scale;
    let logical_x = pos.x as f64 / scale;
    let logical_y = pos.y as f64 / scale;

    if let Some(win) = app.get_webview_window(RIPPLE_WINDOW_LABEL) {
        let _ = win.set_position(PhysicalPosition::new(pos.x, pos.y));
        let _ = win.set_size(PhysicalSize::new(size.width, size.height));
        let _ = win.set_ignore_cursor_events(true);
        let _ = win.set_focusable(false);
        let _ = win.show();
        return;
    }

    match WebviewWindowBuilder::new(
        app,
        RIPPLE_WINDOW_LABEL,
        WebviewUrl::App("/ripple".into()),
    )
    .title("z-key-cast-ripple")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .shadow(false)
    .focused(false)
    .focusable(false)
    .visible(true)
    .position(logical_x, logical_y)
    .inner_size(logical_w, logical_h)
    .build()
    {
        Ok(win) => {
            let _ = win.set_ignore_cursor_events(true);
            let _ = win.set_focusable(false);
        }
        Err(err) => {
            eprintln!("[z-key-cast] ripple window create failed: {err}");
        }
    }
}
