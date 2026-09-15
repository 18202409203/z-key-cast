//! macOS global input capture via CGEventTap + Accessibility trust check.

use std::sync::Mutex;

use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions,
    CGEventTapPlacement, CGEventType, EventField,
};
use tauri::{AppHandle, Emitter};

use super::chip::{modifier_transition, ChipReducer};
use super::event::{
    HookStatus, KeyRef, MouseButton, Phase, RawInput, EVENT_CHANNEL, HOOK_STATUS_CHANNEL,
};
use super::filter::EventFilter;
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
                let _ = app.emit(HOOK_STATUS_CHANNEL, status);
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
                    let chip = reducer
                        .lock()
                        .map(|mut r| r.reduce(&raw))
                        .unwrap_or(None);
                    if let Some(chip) = chip {
                        // Filter after reduce so held-mod state stays correct while a side is off.
                        if settings::allows_chip(&chip) {
                            let _ = app_for_cb.emit(EVENT_CHANNEL, &chip);
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

        let _ = app.emit(HOOK_STATUS_CHANNEL, HookStatus::ok());
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
        _ => None,
    }
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

fn modifier_key_ref(keycode: i64) -> Option<(KeyRef, CGEventFlags)> {
    match keycode {
        55 => Some((KeyRef::new("MetaLeft", "⌘"), CGEventFlags::CGEventFlagCommand)),
        54 => Some((KeyRef::new("MetaRight", "⌘"), CGEventFlags::CGEventFlagCommand)),
        56 => Some((KeyRef::new("ShiftLeft", "⇧"), CGEventFlags::CGEventFlagShift)),
        60 => Some((KeyRef::new("ShiftRight", "⇧"), CGEventFlags::CGEventFlagShift)),
        58 => Some((KeyRef::new("AltLeft", "⌥"), CGEventFlags::CGEventFlagAlternate)),
        61 => Some((KeyRef::new("AltRight", "⌥"), CGEventFlags::CGEventFlagAlternate)),
        59 => Some((
            KeyRef::new("ControlLeft", "⌃"),
            CGEventFlags::CGEventFlagControl,
        )),
        62 => Some((
            KeyRef::new("ControlRight", "⌃"),
            CGEventFlags::CGEventFlagControl,
        )),
        63 => Some((
            KeyRef::new("Fn", "Fn"),
            CGEventFlags::CGEventFlagSecondaryFn,
        )),
        _ => None,
    }
}

fn key_ref(keycode: i64) -> KeyRef {
    match keycode {
        0 => KeyRef::new("KeyA", "A"),
        1 => KeyRef::new("KeyS", "S"),
        2 => KeyRef::new("KeyD", "D"),
        3 => KeyRef::new("KeyF", "F"),
        4 => KeyRef::new("KeyH", "H"),
        5 => KeyRef::new("KeyG", "G"),
        6 => KeyRef::new("KeyZ", "Z"),
        7 => KeyRef::new("KeyX", "X"),
        8 => KeyRef::new("KeyC", "C"),
        9 => KeyRef::new("KeyV", "V"),
        11 => KeyRef::new("KeyB", "B"),
        12 => KeyRef::new("KeyQ", "Q"),
        13 => KeyRef::new("KeyW", "W"),
        14 => KeyRef::new("KeyE", "E"),
        15 => KeyRef::new("KeyR", "R"),
        16 => KeyRef::new("KeyY", "Y"),
        17 => KeyRef::new("KeyT", "T"),
        18 => KeyRef::new("Digit1", "1"),
        19 => KeyRef::new("Digit2", "2"),
        20 => KeyRef::new("Digit3", "3"),
        21 => KeyRef::new("Digit4", "4"),
        22 => KeyRef::new("Digit6", "6"),
        23 => KeyRef::new("Digit5", "5"),
        24 => KeyRef::new("Equal", "="),
        25 => KeyRef::new("Digit9", "9"),
        26 => KeyRef::new("Digit7", "7"),
        27 => KeyRef::new("Minus", "-"),
        28 => KeyRef::new("Digit8", "8"),
        29 => KeyRef::new("Digit0", "0"),
        30 => KeyRef::new("BracketRight", "]"),
        31 => KeyRef::new("KeyO", "O"),
        32 => KeyRef::new("KeyU", "U"),
        33 => KeyRef::new("BracketLeft", "["),
        34 => KeyRef::new("KeyI", "I"),
        35 => KeyRef::new("KeyP", "P"),
        36 => KeyRef::new("Enter", "Return"),
        37 => KeyRef::new("KeyL", "L"),
        38 => KeyRef::new("KeyJ", "J"),
        39 => KeyRef::new("Quote", "'"),
        40 => KeyRef::new("KeyK", "K"),
        41 => KeyRef::new("Semicolon", ";"),
        42 => KeyRef::new("Backslash", "\\"),
        43 => KeyRef::new("Comma", ","),
        44 => KeyRef::new("Slash", "/"),
        45 => KeyRef::new("KeyN", "N"),
        46 => KeyRef::new("KeyM", "M"),
        47 => KeyRef::new("Period", "."),
        48 => KeyRef::new("Tab", "Tab"),
        49 => KeyRef::new("Space", "Space"),
        50 => KeyRef::new("Backquote", "`"),
        // macOS keycode 51 is Backspace (labeled "delete" on keyboards); 117 is ForwardDelete.
        51 => KeyRef::new("Backspace", "⌫"),
        53 => KeyRef::new("Escape", "Esc"),
        64 => KeyRef::new("F17", "F17"),
        65 => KeyRef::new("NumpadDecimal", "Num."),
        67 => KeyRef::new("NumpadMultiply", "Num*"),
        69 => KeyRef::new("NumpadAdd", "Num+"),
        71 => KeyRef::new("NumLock", "Clear"),
        75 => KeyRef::new("NumpadDivide", "Num/"),
        76 => KeyRef::new("NumpadEnter", "NumEnter"),
        78 => KeyRef::new("NumpadSubtract", "Num-"),
        79 => KeyRef::new("F18", "F18"),
        80 => KeyRef::new("F19", "F19"),
        81 => KeyRef::new("NumpadEqual", "Num="),
        82 => KeyRef::new("Numpad0", "Num0"),
        83 => KeyRef::new("Numpad1", "Num1"),
        84 => KeyRef::new("Numpad2", "Num2"),
        85 => KeyRef::new("Numpad3", "Num3"),
        86 => KeyRef::new("Numpad4", "Num4"),
        87 => KeyRef::new("Numpad5", "Num5"),
        88 => KeyRef::new("Numpad6", "Num6"),
        89 => KeyRef::new("Numpad7", "Num7"),
        90 => KeyRef::new("F20", "F20"),
        91 => KeyRef::new("Numpad8", "Num8"),
        92 => KeyRef::new("Numpad9", "Num9"),
        96 => KeyRef::new("F5", "F5"),
        97 => KeyRef::new("F6", "F6"),
        98 => KeyRef::new("F7", "F7"),
        99 => KeyRef::new("F3", "F3"),
        100 => KeyRef::new("F8", "F8"),
        101 => KeyRef::new("F9", "F9"),
        103 => KeyRef::new("F11", "F11"),
        105 => KeyRef::new("F13", "F13"),
        106 => KeyRef::new("F16", "F16"),
        107 => KeyRef::new("F14", "F14"),
        109 => KeyRef::new("F10", "F10"),
        111 => KeyRef::new("F12", "F12"),
        113 => KeyRef::new("F15", "F15"),
        114 => KeyRef::new("Help", "Help"),
        115 => KeyRef::new("Home", "Home"),
        116 => KeyRef::new("PageUp", "PageUp"),
        117 => KeyRef::new("ForwardDelete", "⌦"),
        118 => KeyRef::new("F4", "F4"),
        119 => KeyRef::new("End", "End"),
        120 => KeyRef::new("F2", "F2"),
        121 => KeyRef::new("PageDown", "PageDown"),
        122 => KeyRef::new("F1", "F1"),
        123 => KeyRef::new("ArrowLeft", "←"),
        124 => KeyRef::new("ArrowRight", "→"),
        125 => KeyRef::new("ArrowDown", "↓"),
        126 => KeyRef::new("ArrowUp", "↑"),
        _ => KeyRef::new(format!("Key{keycode}"), format!("Key{keycode}")),
    }
}
