mod input;
mod settings;
mod tray;

use tauri::{Manager, RunEvent, WindowEvent};

#[tauri::command]
fn is_updater_enabled() -> bool {
    cfg!(feature = "updater")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(feature = "updater")]
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    #[cfg(not(feature = "updater"))]
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    builder
        .invoke_handler(tauri::generate_handler![
            is_updater_enabled,
            input::get_hook_status,
            settings::get_capture_settings,
            settings::set_capture_settings,
            settings::arm_ignore_key_capture,
            settings::cancel_ignore_key_capture,
            settings::get_hud_style_settings,
            settings::set_hud_style_settings,
            settings::get_hud_position_settings,
            settings::set_hud_position_settings,
            settings::enter_hud_custom_mode,
            settings::set_hud_custom_content_corner,
            settings::start_hud_place_mode,
            settings::end_hud_place_mode,
            settings::get_ui_locale_settings,
            settings::set_ui_locale_settings,
            settings::get_ui_appearance_settings,
            settings::set_ui_appearance_settings,
        ])
        .setup(|app| {
            settings::load(app.handle());

            if let Some(overlay) = app.get_webview_window("overlay") {
                // Click-through so the HUD never steals pointer input from the desktop.
                let _ = overlay.set_ignore_cursor_events(true);
                settings::apply_hud_position(app.handle());
            }

            // Overlay/ripple must not steal key-window focus from Settings (macOS).
            settings::harden_hud_layers(app.handle());

            // Ripple is lazy: only create when the persisted toggle is already on.
            settings::sync_ripple_window(app.handle());
            settings::harden_hud_layers(app.handle());

            tray::build_tray(app.handle())?;

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
            // X on Settings: hide Main (keep webview); abandon place-mode. HUD stays up.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "main" => {
                api.prevent_close();
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.hide();
                }
                settings::abandon_hud_place_mode(app);
            }
            // Quit / unexpected destroy: still clear place-mode click-through.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::Destroyed,
                ..
            } if label == "main" => {
                settings::abandon_hud_place_mode(app);
            }
            // HUD layers must not keep key focus while Settings is open.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::Focused(true),
                ..
            } if label == "overlay" || label == "ripple" => {
                settings::on_hud_layer_focused(app, &label);
            }
            // macOS Dock click / reopen — overlay may count as visible; always show Main.
            RunEvent::Reopen { .. } => {
                tray::show_main(app);
            }
            RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                settings::abandon_hud_place_mode(app);
            }
            _ => {}
        });
}
