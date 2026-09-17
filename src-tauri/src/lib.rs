mod input;
mod settings;

use tauri::{Manager, RunEvent, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            input::get_hook_status,
            settings::get_capture_settings,
            settings::set_capture_settings,
            settings::arm_ignore_key_capture,
            settings::cancel_ignore_key_capture,
            settings::get_hud_style_settings,
            settings::set_hud_style_settings,
            settings::get_hud_position_settings,
            settings::set_hud_position_settings,
            settings::start_hud_place_mode,
            settings::end_hud_place_mode,
            settings::get_ui_locale_settings,
            settings::set_ui_locale_settings,
        ])
        .setup(|app| {
            settings::load(app.handle());

            if let Some(overlay) = app.get_webview_window("overlay") {
                // Click-through so the HUD never steals pointer input from the desktop.
                let _ = overlay.set_ignore_cursor_events(true);
                settings::apply_hud_position(app.handle());
            }

            // Ripple is lazy: only create when the persisted toggle is already on.
            settings::sync_ripple_window(app.handle());

            // Give webviews a moment to subscribe before the first hook-status emit.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(600));
                input::start(handle);
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            // Closing Settings while placing must not leave the overlay stealing clicks.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed,
                ..
            } if label == "main" => {
                settings::abandon_hud_place_mode(app);
            }
            RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                settings::abandon_hud_place_mode(app);
            }
            _ => {}
        });
}
