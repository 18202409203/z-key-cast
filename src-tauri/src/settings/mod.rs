//! Durable app settings: capture toggles + HUD appearance + position + ignored keys.

mod appearance;
mod capture;
mod hud;
mod locale;
mod ripple;
mod store;
mod types;

#[allow(unused_imports)] // facade: keep `settings::arm_ignore_capture` etc. stable
pub use capture::{
    allows_chip, arm_ignore_capture, arm_ignore_key_capture, cancel_ignore_capture,
    cancel_ignore_key_capture, filter_key_chip, get_capture_settings, set_capture_settings,
    take_ignore_capture,
};
pub use hud::{
    abandon_hud_place_mode, apply_hud_position, end_hud_place_mode, get_hud_position_settings,
    get_hud_style_settings, set_hud_position_settings, set_hud_style_settings, start_hud_place_mode,
};
pub use appearance::{get_ui_appearance_settings, set_ui_appearance_settings};
pub use locale::{get_ui_locale_settings, set_ui_locale_settings};
pub use ripple::sync_ripple_window;
pub use store::{load, mouse_click_ripple_enabled};
#[allow(unused_imports)] // public API surface for TS-aligned types / helpers
pub use types::{
    AppSettings, CaptureSettings, HudCorner, HudPlaceModePayload, HudPositionSettings, HudPreset,
    HudStyleSettings, KeyMouseLayout, KeyboardLegendLayout, UiAppearance, UiAppearancePayload,
    UiLocale, UiLocalePayload,
};

// `tauri::generate_handler![settings::…]` resolves `__cmd__*` / `__tauri_command_name_*`
// in this module — re-export them from the owning submodules.
#[doc(hidden)]
pub use capture::{
    __cmd__arm_ignore_key_capture, __cmd__cancel_ignore_key_capture, __cmd__get_capture_settings,
    __cmd__set_capture_settings, __tauri_command_name_arm_ignore_key_capture,
    __tauri_command_name_cancel_ignore_key_capture, __tauri_command_name_get_capture_settings,
    __tauri_command_name_set_capture_settings,
};
#[doc(hidden)]
pub use hud::{
    __cmd__end_hud_place_mode, __cmd__get_hud_position_settings, __cmd__get_hud_style_settings,
    __cmd__set_hud_position_settings, __cmd__set_hud_style_settings, __cmd__start_hud_place_mode,
    __tauri_command_name_end_hud_place_mode, __tauri_command_name_get_hud_position_settings,
    __tauri_command_name_get_hud_style_settings, __tauri_command_name_set_hud_position_settings,
    __tauri_command_name_set_hud_style_settings, __tauri_command_name_start_hud_place_mode,
};
#[doc(hidden)]
pub use locale::{
    __cmd__get_ui_locale_settings, __cmd__set_ui_locale_settings,
    __tauri_command_name_get_ui_locale_settings, __tauri_command_name_set_ui_locale_settings,
};
#[doc(hidden)]
pub use appearance::{
    __cmd__get_ui_appearance_settings, __cmd__set_ui_appearance_settings,
    __tauri_command_name_get_ui_appearance_settings, __tauri_command_name_set_ui_appearance_settings,
};

pub const HUD_STYLE_CHANNEL: &str = "cast://hud-style";
pub const HUD_POSITION_CHANNEL: &str = "cast://hud-position";
pub const HUD_PLACE_MODE_CHANNEL: &str = "cast://hud-place-mode";
pub const UI_LOCALE_CHANNEL: &str = "cast://ui-locale";
pub const UI_APPEARANCE_CHANNEL: &str = "cast://ui-appearance";
pub const CAPTURE_SETTINGS_CHANNEL: &str = "cast://capture-settings";
pub const RIPPLE_WINDOW_LABEL: &str = "ripple";
