mod input;
mod settings;

use tauri::{Manager, PhysicalPosition};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            settings::get_capture_settings,
            settings::set_capture_settings,
            settings::get_hud_style_settings,
            settings::set_hud_style_settings,
        ])
        .setup(|app| {
            settings::load(app.handle());

            if let Some(overlay) = app.get_webview_window("overlay") {
                // Click-through so the HUD never steals pointer input from the desktop.
                let _ = overlay.set_ignore_cursor_events(true);

                if let Ok(Some(monitor)) = overlay.current_monitor() {
                    let screen = monitor.size();
                    let scale = monitor.scale_factor();
                    if let Ok(size) = overlay.outer_size() {
                        let margin_x = (24.0 * scale) as i32;
                        let margin_y = (48.0 * scale) as i32;
                        let x = screen.width as i32 - size.width as i32 - margin_x;
                        let y = screen.height as i32 - size.height as i32 - margin_y;
                        let _ = overlay.set_position(PhysicalPosition::new(x, y));
                    }
                }
            }

            // Give webviews a moment to subscribe before the first hook-status emit.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(600));
                input::start(handle);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
