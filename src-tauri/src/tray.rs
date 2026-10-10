//! System tray: show Main / quit. HUD stays always on (no tray toggle).

use std::sync::{Mutex, OnceLock};

#[cfg(target_os = "macos")]
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};

use crate::settings::UiLocale;

const OPEN_SETTINGS_ID: &str = "open-settings";
const QUIT_ID: &str = "quit";

struct TrayMenuItems {
    open_settings: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

static TRAY_MENU: OnceLock<Mutex<TrayMenuItems>> = OnceLock::new();

fn labels_for(locale: UiLocale) -> (&'static str, &'static str) {
    match locale {
        UiLocale::Zh => ("打开设置", "退出"),
        UiLocale::En => ("Open Settings", "Quit"),
    }
}

fn resolved_locale() -> UiLocale {
    crate::settings::get_ui_locale_settings().unwrap_or(UiLocale::En)
}

/// Show + focus the Main (Settings) window.
pub fn show_main(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
}

/// Update tray menu labels after a successful locale change.
pub fn refresh_menu_labels(locale: UiLocale) {
    let Some(guard) = TRAY_MENU.get() else {
        return;
    };
    let Ok(items) = guard.lock() else {
        return;
    };
    let (open, quit) = labels_for(locale);
    let _ = items.open_settings.set_text(open);
    let _ = items.quit.set_text(quit);
}

/// Build the tray icon + menu during app setup.
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let locale = resolved_locale();
    let (open_label, quit_label) = labels_for(locale);

    let open_settings = MenuItem::with_id(app, OPEN_SETTINGS_ID, open_label, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, quit_label, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_settings, &quit])?;

    let _ = TRAY_MENU.set(Mutex::new(TrayMenuItems {
        open_settings: open_settings.clone(),
        quit: quit.clone(),
    }));

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("z-key-cast")
        .on_menu_event(|app, event| match event.id.as_ref() {
            OPEN_SETTINGS_ID => show_main(app),
            QUIT_ID => {
                crate::settings::abandon_hud_place_mode(app);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });

    // macOS menu bar: same slim pair as the Dock mark, black on transparency.
    // The echo is lower alpha so template mode paints it as a dimmer shadow.
    // Do not use the rounded app icon here; template mode would fill the plate.
    #[cfg(target_os = "macos")]
    {
        let icon = Image::from_bytes(include_bytes!("../icons/tray-template.png"))?;
        builder = builder.icon(icon).icon_as_template(true);
    }

    #[cfg(not(target_os = "macos"))]
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    let _tray = builder.build(app)?;
    Ok(())
}
