//! macOS global input capture via CGEventTap + Accessibility trust check.

use std::sync::Mutex;

use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions,
    CGEventTapPlacement, CGEventType, EventField,
};
use tauri::{AppHandle, Emitter};

use super::event::{
    CastEvent, HookStatus, MouseButton, Phase, EVENT_CHANNEL, HOOK_STATUS_CHANNEL,
};
use super::filter::EventFilter;

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
            if let Some(cast) = normalize(event_type, event) {
                let should_emit = filter
                    .lock()
                    .map(|mut f| f.allow(&cast))
                    .unwrap_or(true);
                if should_emit {
                    let _ = app_for_cb.emit(EVENT_CHANNEL, &cast);
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

fn normalize(event_type: CGEventType, event: &CGEvent) -> Option<CastEvent> {
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
            let key = key_name(keycode);
            let phase = if is_down { Phase::Down } else { Phase::Up };
            let mods = modifier_symbols(event.get_flags(), Some(keycode));
            Some(CastEvent::Key { key, mods, phase })
        }
        CGEventType::FlagsChanged => normalize_flags_changed(event),
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

fn normalize_flags_changed(event: &CGEvent) -> Option<CastEvent> {
    let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
    let flags = event.get_flags();
    let (key, bit) = match keycode {
        54 | 55 => ("⌘", CGEventFlags::CGEventFlagCommand),
        56 | 60 => ("⇧", CGEventFlags::CGEventFlagShift),
        58 | 61 => ("⌥", CGEventFlags::CGEventFlagAlternate),
        59 | 62 => ("⌃", CGEventFlags::CGEventFlagControl),
        63 => ("Fn", CGEventFlags::CGEventFlagSecondaryFn),
        _ => return None,
    };

    let phase = if flags.contains(bit) {
        Phase::Down
    } else {
        Phase::Up
    };
    let mods = modifier_symbols(flags, Some(keycode));
    Some(CastEvent::Key {
        key: key.to_string(),
        mods,
        phase,
    })
}

fn mouse(button: MouseButton, phase: Phase) -> CastEvent {
    CastEvent::Mouse { button, phase }
}

fn modifier_symbols(flags: CGEventFlags, exclude_keycode: Option<i64>) -> Vec<String> {
    let mut mods = Vec::new();
    let skip_cmd = matches!(exclude_keycode, Some(54 | 55));
    let skip_shift = matches!(exclude_keycode, Some(56 | 60));
    let skip_opt = matches!(exclude_keycode, Some(58 | 61));
    let skip_ctrl = matches!(exclude_keycode, Some(59 | 62));

    if flags.contains(CGEventFlags::CGEventFlagControl) && !skip_ctrl {
        mods.push("⌃".into());
    }
    if flags.contains(CGEventFlags::CGEventFlagAlternate) && !skip_opt {
        mods.push("⌥".into());
    }
    if flags.contains(CGEventFlags::CGEventFlagShift) && !skip_shift {
        mods.push("⇧".into());
    }
    if flags.contains(CGEventFlags::CGEventFlagCommand) && !skip_cmd {
        mods.push("⌘".into());
    }
    mods
}

fn key_name(keycode: i64) -> String {
    match keycode {
        0 => "A",
        1 => "S",
        2 => "D",
        3 => "F",
        4 => "H",
        5 => "G",
        6 => "Z",
        7 => "X",
        8 => "C",
        9 => "V",
        11 => "B",
        12 => "Q",
        13 => "W",
        14 => "E",
        15 => "R",
        16 => "Y",
        17 => "T",
        18 => "1",
        19 => "2",
        20 => "3",
        21 => "4",
        22 => "6",
        23 => "5",
        24 => "=",
        25 => "9",
        26 => "7",
        27 => "-",
        28 => "8",
        29 => "0",
        30 => "]",
        31 => "O",
        32 => "U",
        33 => "[",
        34 => "I",
        35 => "P",
        36 => "Return",
        37 => "L",
        38 => "J",
        39 => "'",
        40 => "K",
        41 => ";",
        42 => "\\",
        43 => ",",
        44 => "/",
        45 => "N",
        46 => "M",
        47 => ".",
        48 => "Tab",
        49 => "Space",
        50 => "`",
        51 => "Delete",
        53 => "Escape",
        54 | 55 => "⌘",
        56 | 60 => "⇧",
        57 => "CapsLock",
        58 | 61 => "⌥",
        59 | 62 => "⌃",
        63 => "Fn",
        64 => "F17",
        65 => "NumPad.",
        67 => "NumPad*",
        69 => "NumPad+",
        71 => "Clear",
        75 => "NumPad/",
        76 => "NumPadEnter",
        78 => "NumPad-",
        79 => "F18",
        80 => "F19",
        81 => "NumPad=",
        82 => "NumPad0",
        83 => "NumPad1",
        84 => "NumPad2",
        85 => "NumPad3",
        86 => "NumPad4",
        87 => "NumPad5",
        88 => "NumPad6",
        89 => "NumPad7",
        90 => "F20",
        91 => "NumPad8",
        92 => "NumPad9",
        96 => "F5",
        97 => "F6",
        98 => "F7",
        99 => "F3",
        100 => "F8",
        101 => "F9",
        103 => "F11",
        105 => "F13",
        106 => "F16",
        107 => "F14",
        109 => "F10",
        111 => "F12",
        113 => "F15",
        114 => "Help",
        115 => "Home",
        116 => "PageUp",
        117 => "ForwardDelete",
        118 => "F4",
        119 => "End",
        120 => "F2",
        121 => "PageDown",
        122 => "F1",
        123 => "←",
        124 => "→",
        125 => "↓",
        126 => "↑",
        _ => return format!("Key{keycode}"),
    }
    .to_string()
}
