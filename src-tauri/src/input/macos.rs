//! macOS global input capture via CGEventTap + Accessibility trust check.

use std::sync::Mutex;

use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_graphics::display::CGDisplay;
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions,
    CGEventTapPlacement, CGEventType, EventField,
};
use tauri::{AppHandle, Emitter, Manager};

use super::chip::{modifier_transition, ChipReducer};
use super::emit_hook_status;
use super::event::{
    HookStatus, KeyRef, MouseButton, MouseRippleEvent, Phase, RawInput, ScrollDirection,
    EVENT_CHANNEL, IGNORE_KEY_CAPTURED_CHANNEL, MOUSE_RIPPLE_CHANNEL,
};
use super::filter::{EventFilter, ScrollCoalescer};
use crate::settings;

/// Start the hook on a dedicated thread so CFRunLoop does not block Tauri's main thread.
pub fn start(app: AppHandle) {
    std::thread::Builder::new()
        .name("z-key-cast-input".into())
        .spawn(move || {
            if let Err(status) = run_tap(app.clone()) {
                eprintln!(
                    "[z-key-cast] input hook failed: {}",
                    status.reason.as_deref().unwrap_or("unknown")
                );
                emit_hook_status(&app, status);
            }
        })
        .expect("failed to spawn input hook thread");
}

fn run_tap(app: AppHandle) -> Result<(), HookStatus> {
    if !is_process_trusted(true) {
        return Err(HookStatus::denied("accessibility_denied"));
    }

    let filter = Mutex::new(EventFilter::default());
    let reducer = Mutex::new(ChipReducer::default());
    let scroll_coalesce = Mutex::new(ScrollCoalescer::default());
    let app_for_cb = app.clone();

    let tap = CGEventTap::new(
        CGEventTapLocation::HID,
        CGEventTapPlacement::HeadInsertEventTap,
        CGEventTapOptions::ListenOnly,
        vec![
            CGEventType::KeyDown,
            CGEventType::KeyUp,
            CGEventType::FlagsChanged,
            CGEventType::LeftMouseDown,
            CGEventType::LeftMouseUp,
            CGEventType::RightMouseDown,
            CGEventType::RightMouseUp,
            CGEventType::OtherMouseDown,
            CGEventType::OtherMouseUp,
            CGEventType::ScrollWheel,
        ],
        move |_proxy, event_type, event: &CGEvent| {
            let held = |id: &str| {
                reducer
                    .lock()
                    .map(|r| r.is_holding(id))
                    .unwrap_or(false)
            };
            if let Some(raw) = normalize(event_type, event, &held) {
                let should_process = filter
                    .lock()
                    .map(|mut f| f.allow(&raw))
                    .unwrap_or(true);
                if should_process {
                    let raw = if let RawInput::Scroll { direction } = raw {
                        let allow = scroll_coalesce
                            .lock()
                            .map(|mut c| c.allow(direction))
                            .unwrap_or(true);
                        if !allow {
                            return None;
                        }
                        RawInput::Scroll { direction }
                    } else {
                        raw
                    };

                    // Capture next key/mod down for ignore list; still reduce held mods.
                    let mut suppress_emit = false;
                    if let RawInput::Key {
                        key,
                        phase: Phase::Down,
                        ..
                    } = &raw
                    {
                        if settings::take_ignore_capture() {
                            let _ = app_for_cb.emit(IGNORE_KEY_CAPTURED_CHANNEL, key);
                            suppress_emit = true;
                        }
                    }

                    // Ripple is independent of captureMouse / allows_chip / HudChip.
                    if let RawInput::Mouse {
                        button,
                        phase: Phase::Down,
                    } = &raw
                    {
                        maybe_emit_mouse_ripple(&app_for_cb, event, *button);
                    }

                    let chip = reducer
                        .lock()
                        .map(|mut r| r.reduce(&raw))
                        .unwrap_or(None);
                    if !suppress_emit {
                        if let Some(chip) = chip {
                            // Ignore-list then capture toggles — after reduce so held mods stay correct.
                            if let Some(chip) = settings::filter_key_chip(chip) {
                                if settings::allows_chip(&chip) {
                                    let _ = app_for_cb.emit(EVENT_CHANNEL, &chip);
                                }
                            }
                        }
                    }
                }
            }
            // ListenOnly: pass through unchanged.
            None
        },
    )
    .map_err(|_| HookStatus::denied("tap_create_failed"))?;

    unsafe {
        let loop_source = tap
            .mach_port
            .create_runloop_source(0)
            .map_err(|_| HookStatus::denied("runloop_source_failed"))?;
        let current = CFRunLoop::get_current();
        current.add_source(&loop_source, kCFRunLoopCommonModes);
        tap.enable();

        emit_hook_status(&app, HookStatus::ok());
        eprintln!("[z-key-cast] input hook started (CGEventTap)");

        CFRunLoop::run_current();
    }
    Ok(())
}

fn is_process_trusted(prompt: bool) -> bool {
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
        fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
        static kAXTrustedCheckOptionPrompt: *const std::ffi::c_void;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFDictionaryCreate(
            allocator: *const std::ffi::c_void,
            keys: *const *const std::ffi::c_void,
            values: *const *const std::ffi::c_void,
            num_values: isize,
            key_callbacks: *const std::ffi::c_void,
            value_callbacks: *const std::ffi::c_void,
        ) -> *const std::ffi::c_void;
        fn CFRelease(cf: *const std::ffi::c_void);
        static kCFBooleanTrue: *const std::ffi::c_void;
        static kCFTypeDictionaryKeyCallBacks: std::ffi::c_void;
        static kCFTypeDictionaryValueCallBacks: std::ffi::c_void;
    }

    if !prompt {
        return unsafe { AXIsProcessTrusted() };
    }

    unsafe {
        let keys = [kAXTrustedCheckOptionPrompt];
        let values = [kCFBooleanTrue];
        let dict = CFDictionaryCreate(
            std::ptr::null(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks,
        );
        let trusted = AXIsProcessTrustedWithOptions(dict);
        if !dict.is_null() {
            CFRelease(dict);
        }
        trusted
    }
}

fn normalize(
    event_type: CGEventType,
    event: &CGEvent,
    is_holding: &dyn Fn(&str) -> bool,
) -> Option<RawInput> {
    match event_type {
        CGEventType::KeyDown | CGEventType::KeyUp => {
            let is_down = matches!(event_type, CGEventType::KeyDown);
            // Autorepeat key-downs are the main HUD spam source.
            if is_down {
                let autorepeat = event.get_integer_value_field(EventField::KEYBOARD_EVENT_AUTOREPEAT);
                if autorepeat != 0 {
                    return None;
                }
            }

            let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
            // Modifier physical keys arrive as FlagsChanged on macOS; ignore here.
            if modifier_key_ref(keycode).is_some() {
                return None;
            }
            let key = key_ref(keycode);
            let phase = if is_down { Phase::Down } else { Phase::Up };
            Some(RawInput::Key {
                key,
                phase,
                is_modifier: false,
            })
        }
        CGEventType::FlagsChanged => normalize_flags_changed(event, is_holding),
        CGEventType::LeftMouseDown => Some(mouse(MouseButton::Left, Phase::Down)),
        CGEventType::LeftMouseUp => Some(mouse(MouseButton::Left, Phase::Up)),
        CGEventType::RightMouseDown => Some(mouse(MouseButton::Right, Phase::Down)),
        CGEventType::RightMouseUp => Some(mouse(MouseButton::Right, Phase::Up)),
        CGEventType::OtherMouseDown | CGEventType::OtherMouseUp => {
            let button_number =
                event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER);
            // 2 == middle on macOS; ignore extra buttons.
            if button_number != 2 {
                return None;
            }
            let phase = if matches!(event_type, CGEventType::OtherMouseDown) {
                Phase::Down
            } else {
                Phase::Up
            };
            Some(mouse(MouseButton::Middle, phase))
        }
        CGEventType::ScrollWheel => normalize_scroll(event),
        _ => None,
    }
}

fn normalize_scroll(event: &CGEvent) -> Option<RawInput> {
    let continuous =
        event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_IS_CONTINUOUS) != 0;
    let delta = if continuous {
        event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_POINT_DELTA_AXIS_1)
    } else {
        event.get_integer_value_field(EventField::SCROLL_WHEEL_EVENT_DELTA_AXIS_1)
    };
    // Vertical only — zero vertical (horizontal / empty) is dropped.
    if delta == 0 {
        return None;
    }
    let direction = if delta > 0 {
        ScrollDirection::Up
    } else {
        ScrollDirection::Down
    };
    Some(RawInput::Scroll { direction })
}

fn normalize_flags_changed(
    event: &CGEvent,
    is_holding: &dyn Fn(&str) -> bool,
) -> Option<RawInput> {
    let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
    // CapsLock is not a chord modifier for HUD chips.
    if keycode == 57 {
        return None;
    }
    let (key, bit) = modifier_key_ref(keycode)?;
    let flags = event.get_flags();
    let flag_on = flags.contains(bit);
    let was_held = is_holding(&key.id);
    let phase = modifier_transition(flag_on, was_held);
    Some(RawInput::Key {
        key,
        phase,
        is_modifier: true,
    })
}

fn mouse(button: MouseButton, phase: Phase) -> RawInput {
    RawInput::Mouse { button, phase }
}

fn maybe_emit_mouse_ripple(app: &AppHandle, event: &CGEvent, button: MouseButton) {
    if !settings::mouse_click_ripple_enabled() {
        return;
    }
    let Some((x, y)) = primary_local_click(event) else {
        return;
    };
    let Some(win) = app.get_webview_window(settings::RIPPLE_WINDOW_LABEL) else {
        return;
    };
    let _ = win.emit(
        MOUSE_RIPPLE_CHANNEL,
        MouseRippleEvent { x, y, button },
    );
}

/// Map CGEvent location into primary-monitor top-left local coords; drop external screens.
fn primary_local_click(event: &CGEvent) -> Option<(f64, f64)> {
    let loc = event.location();
    let bounds = CGDisplay::main().bounds();
    let min_x = bounds.origin.x;
    let min_y = bounds.origin.y;
    let width = bounds.size.width;
    let height = bounds.size.height;
    if loc.x < min_x || loc.y < min_y || loc.x >= min_x + width || loc.y >= min_y + height {
        return None;
    }
    // CGEvent location + CGDisplay bounds share global coords with origin at the
    // upper-left of the main display — same as CSS top-left; do not flip Y.
    let local_x = loc.x - min_x;
    let local_y = loc.y - min_y;
    Some((local_x, local_y))
}

fn modifier_key_ref(keycode: i64) -> Option<(KeyRef, CGEventFlags)> {
    match keycode {
        55 => Some((KeyRef::new("MetaLeft"), CGEventFlags::CGEventFlagCommand)),
        54 => Some((KeyRef::new("MetaRight"), CGEventFlags::CGEventFlagCommand)),
        56 => Some((KeyRef::new("ShiftLeft"), CGEventFlags::CGEventFlagShift)),
        60 => Some((KeyRef::new("ShiftRight"), CGEventFlags::CGEventFlagShift)),
        58 => Some((KeyRef::new("AltLeft"), CGEventFlags::CGEventFlagAlternate)),
        61 => Some((KeyRef::new("AltRight"), CGEventFlags::CGEventFlagAlternate)),
        59 => Some((
            KeyRef::new("ControlLeft"),
            CGEventFlags::CGEventFlagControl,
        )),
        62 => Some((
            KeyRef::new("ControlRight"),
            CGEventFlags::CGEventFlagControl,
        )),
        63 => Some((
            KeyRef::new("Fn"),
            CGEventFlags::CGEventFlagSecondaryFn,
        )),
        _ => None,
    }
}

fn key_ref(keycode: i64) -> KeyRef {
    match keycode {
        0 => KeyRef::new("KeyA"),
        1 => KeyRef::new("KeyS"),
        2 => KeyRef::new("KeyD"),
        3 => KeyRef::new("KeyF"),
        4 => KeyRef::new("KeyH"),
        5 => KeyRef::new("KeyG"),
        6 => KeyRef::new("KeyZ"),
        7 => KeyRef::new("KeyX"),
        8 => KeyRef::new("KeyC"),
        9 => KeyRef::new("KeyV"),
        11 => KeyRef::new("KeyB"),
        12 => KeyRef::new("KeyQ"),
        13 => KeyRef::new("KeyW"),
        14 => KeyRef::new("KeyE"),
        15 => KeyRef::new("KeyR"),
        16 => KeyRef::new("KeyY"),
        17 => KeyRef::new("KeyT"),
        18 => KeyRef::new("Digit1"),
        19 => KeyRef::new("Digit2"),
        20 => KeyRef::new("Digit3"),
        21 => KeyRef::new("Digit4"),
        22 => KeyRef::new("Digit6"),
        23 => KeyRef::new("Digit5"),
        24 => KeyRef::new("Equal"),
        25 => KeyRef::new("Digit9"),
        26 => KeyRef::new("Digit7"),
        27 => KeyRef::new("Minus"),
        28 => KeyRef::new("Digit8"),
        29 => KeyRef::new("Digit0"),
        30 => KeyRef::new("BracketRight"),
        31 => KeyRef::new("KeyO"),
        32 => KeyRef::new("KeyU"),
        33 => KeyRef::new("BracketLeft"),
        34 => KeyRef::new("KeyI"),
        35 => KeyRef::new("KeyP"),
        36 => KeyRef::new("Enter"),
        37 => KeyRef::new("KeyL"),
        38 => KeyRef::new("KeyJ"),
        39 => KeyRef::new("Quote"),
        40 => KeyRef::new("KeyK"),
        41 => KeyRef::new("Semicolon"),
        42 => KeyRef::new("Backslash"),
        43 => KeyRef::new("Comma"),
        44 => KeyRef::new("Slash"),
        45 => KeyRef::new("KeyN"),
        46 => KeyRef::new("KeyM"),
        47 => KeyRef::new("Period"),
        48 => KeyRef::new("Tab"),
        49 => KeyRef::new("Space"),
        50 => KeyRef::new("Backquote"),
        // macOS keycode 51 is Backspace (labeled "delete" on keyboards); 117 is ForwardDelete.
        51 => KeyRef::new("Backspace"),
        53 => KeyRef::new("Escape"),
        64 => KeyRef::new("F17"),
        65 => KeyRef::new("NumpadDecimal"),
        67 => KeyRef::new("NumpadMultiply"),
        69 => KeyRef::new("NumpadAdd"),
        71 => KeyRef::new("NumLock"),
        75 => KeyRef::new("NumpadDivide"),
        76 => KeyRef::new("NumpadEnter"),
        78 => KeyRef::new("NumpadSubtract"),
        79 => KeyRef::new("F18"),
        80 => KeyRef::new("F19"),
        81 => KeyRef::new("NumpadEqual"),
        82 => KeyRef::new("Numpad0"),
        83 => KeyRef::new("Numpad1"),
        84 => KeyRef::new("Numpad2"),
        85 => KeyRef::new("Numpad3"),
        86 => KeyRef::new("Numpad4"),
        87 => KeyRef::new("Numpad5"),
        88 => KeyRef::new("Numpad6"),
        89 => KeyRef::new("Numpad7"),
        90 => KeyRef::new("F20"),
        91 => KeyRef::new("Numpad8"),
        92 => KeyRef::new("Numpad9"),
        96 => KeyRef::new("F5"),
        97 => KeyRef::new("F6"),
        98 => KeyRef::new("F7"),
        99 => KeyRef::new("F3"),
        100 => KeyRef::new("F8"),
        101 => KeyRef::new("F9"),
        103 => KeyRef::new("F11"),
        105 => KeyRef::new("F13"),
        106 => KeyRef::new("F16"),
        107 => KeyRef::new("F14"),
        109 => KeyRef::new("F10"),
        111 => KeyRef::new("F12"),
        113 => KeyRef::new("F15"),
        114 => KeyRef::new("Help"),
        115 => KeyRef::new("Home"),
        116 => KeyRef::new("PageUp"),
        117 => KeyRef::new("ForwardDelete"),
        118 => KeyRef::new("F4"),
        119 => KeyRef::new("End"),
        120 => KeyRef::new("F2"),
        121 => KeyRef::new("PageDown"),
        122 => KeyRef::new("F1"),
        123 => KeyRef::new("ArrowLeft"),
        124 => KeyRef::new("ArrowRight"),
        125 => KeyRef::new("ArrowDown"),
        126 => KeyRef::new("ArrowUp"),
        _ => KeyRef::new(format!("Key{keycode}")),
    }
}
