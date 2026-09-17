//! Windows global input capture via WH_KEYBOARD_LL + WH_MOUSE_LL.
//!
//! No mouse-ripple emit on this platform (deferred). Display labels stay in the UI.

use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Emitter};
use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, MAPVK_VK_TO_VSC, VIRTUAL_KEY, VK_ADD, VK_APPS, VK_BACK, VK_CAPITAL, VK_CONTROL,
    VK_DECIMAL, VK_DELETE, VK_DIVIDE, VK_DOWN, VK_END, VK_ESCAPE, VK_F1, VK_F10, VK_F11, VK_F12,
    VK_F13, VK_F14, VK_F15, VK_F16, VK_F17, VK_F18, VK_F19, VK_F2, VK_F20, VK_F3, VK_F4, VK_F5,
    VK_F6, VK_F7, VK_F8, VK_F9, VK_HOME, VK_INSERT, VK_LCONTROL, VK_LEFT, VK_LMENU, VK_LSHIFT,
    VK_LWIN, VK_MENU, VK_MULTIPLY, VK_NEXT, VK_NUMLOCK, VK_NUMPAD0, VK_NUMPAD1, VK_NUMPAD2,
    VK_NUMPAD3, VK_NUMPAD4, VK_NUMPAD5, VK_NUMPAD6, VK_NUMPAD7, VK_NUMPAD8, VK_NUMPAD9, VK_OEM_1,
    VK_OEM_2, VK_OEM_3, VK_OEM_4, VK_OEM_5, VK_OEM_6, VK_OEM_7, VK_OEM_COMMA, VK_OEM_MINUS,
    VK_OEM_PERIOD, VK_OEM_PLUS, VK_PRIOR, VK_RCONTROL, VK_RETURN, VK_RIGHT, VK_RMENU, VK_RSHIFT,
    VK_RWIN, VK_SHIFT, VK_SNAPSHOT, VK_SPACE, VK_SUBTRACT, VK_TAB, VK_UP,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage,
    UnhookWindowsHookEx, HHOOK, KBDLLHOOKSTRUCT, LLKHF_EXTENDED, LLKHF_UP, MSG, WH_KEYBOARD_LL,
    WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN, WM_MBUTTONUP,
    WM_RBUTTONDOWN, WM_RBUTTONUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

use super::chip::ChipReducer;
use super::emit_hook_status;
use super::event::{
    HookStatus, KeyRef, MouseButton, Phase, RawInput, EVENT_CHANNEL, IGNORE_KEY_CAPTURED_CHANNEL,
};
use super::filter::EventFilter;
use crate::settings;

struct HookState {
    app: AppHandle,
    filter: Mutex<EventFilter>,
    reducer: Mutex<ChipReducer>,
    /// Non-modifier keys currently down — drops autorepeat KeyDown spam.
    held_primaries: Mutex<HashSet<String>>,
}

static STATE: OnceLock<HookState> = OnceLock::new();
static KEYBOARD_HOOK: Mutex<Option<HHOOK>> = Mutex::new(None);
static MOUSE_HOOK: Mutex<Option<HHOOK>> = Mutex::new(None);

/// Start LL hooks on a dedicated thread with its own message loop.
pub fn start(app: AppHandle) {
    std::thread::Builder::new()
        .name("z-key-cast-input".into())
        .spawn(move || {
            if let Err(status) = run_hooks(app.clone()) {
                eprintln!(
                    "[z-key-cast] input hook failed: {}",
                    status.reason.as_deref().unwrap_or("unknown")
                );
                emit_hook_status(&app, status);
            }
        })
        .expect("failed to spawn input hook thread");
}

fn run_hooks(app: AppHandle) -> Result<(), HookStatus> {
    let _ = STATE.set(HookState {
        app: app.clone(),
        filter: Mutex::new(EventFilter::default()),
        reducer: Mutex::new(ChipReducer::default()),
        held_primaries: Mutex::new(HashSet::new()),
    });

    unsafe {
        let keyboard = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(keyboard_proc),
            HINSTANCE::default(),
            0,
        )
        .map_err(|_| HookStatus::denied("keyboard_hook_failed"))?;

        let mouse = match SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), HINSTANCE::default(), 0)
        {
            Ok(h) => h,
            Err(_) => {
                let _ = UnhookWindowsHookEx(keyboard);
                return Err(HookStatus::denied("mouse_hook_failed"));
            }
        };

        if let Ok(mut guard) = KEYBOARD_HOOK.lock() {
            *guard = Some(keyboard);
        }
        if let Ok(mut guard) = MOUSE_HOOK.lock() {
            *guard = Some(mouse);
        }

        emit_hook_status(&app, HookStatus::ok());
        eprintln!("[z-key-cast] input hook started (WH_*_LL)");

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        let _ = UnhookWindowsHookEx(keyboard);
        let _ = UnhookWindowsHookEx(mouse);
    }

    Ok(())
}

fn process_raw(raw: RawInput) {
    let Some(state) = STATE.get() else {
        return;
    };

    let should_process = state
        .filter
        .lock()
        .map(|mut f| f.allow(&raw))
        .unwrap_or(true);
    if !should_process {
        return;
    }

    let mut suppress_emit = false;
    if let RawInput::Key {
        key,
        phase: Phase::Down,
        ..
    } = &raw
    {
        if settings::take_ignore_capture() {
            let _ = state.app.emit(IGNORE_KEY_CAPTURED_CHANNEL, key);
            suppress_emit = true;
        }
    }

    // No mouse-ripple emit on Windows this task.

    let chip = state
        .reducer
        .lock()
        .map(|mut r| r.reduce(&raw))
        .unwrap_or(None);
    if suppress_emit {
        return;
    }
    if let Some(chip) = chip {
        if let Some(chip) = settings::filter_key_chip(chip) {
            if settings::allows_chip(&chip) {
                let _ = state.app.emit(EVENT_CHANNEL, &chip);
            }
        }
    }
}

unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let info = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
        if let Some(raw) = normalize_keyboard(wparam.0 as u32, info) {
            process_raw(raw);
        }
    }
    CallNextHookEx(
        KEYBOARD_HOOK
            .lock()
            .ok()
            .and_then(|g| *g)
            .unwrap_or_default(),
        code,
        wparam,
        lparam,
    )
}

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        if let Some(raw) = normalize_mouse(wparam.0 as u32) {
            process_raw(raw);
        }
    }
    CallNextHookEx(
        MOUSE_HOOK.lock().ok().and_then(|g| *g).unwrap_or_default(),
        code,
        wparam,
        lparam,
    )
}

fn normalize_keyboard(message: u32, info: &KBDLLHOOKSTRUCT) -> Option<RawInput> {
    let phase = if matches!(message, WM_KEYUP | WM_SYSKEYUP) || (info.flags.0 & LLKHF_UP.0) != 0 {
        Phase::Up
    } else if matches!(message, WM_KEYDOWN | WM_SYSKEYDOWN) {
        Phase::Down
    } else {
        return None;
    };

    let extended = (info.flags.0 & LLKHF_EXTENDED.0) != 0;
    let (id, is_modifier) = key_id(info.vkCode, info.scanCode, extended)?;

    if !is_modifier {
        if let Some(state) = STATE.get() {
            if let Ok(mut held) = state.held_primaries.lock() {
                match phase {
                    Phase::Down => {
                        if !held.insert(id.clone()) {
                            // Autorepeat while held.
                            return None;
                        }
                    }
                    Phase::Up => {
                        held.remove(&id);
                    }
                }
            }
        }
    }

    Some(RawInput::Key {
        key: KeyRef::new(id),
        phase,
        is_modifier,
    })
}

fn normalize_mouse(message: u32) -> Option<RawInput> {
    let (button, phase) = match message {
        WM_LBUTTONDOWN => (MouseButton::Left, Phase::Down),
        WM_LBUTTONUP => (MouseButton::Left, Phase::Up),
        WM_RBUTTONDOWN => (MouseButton::Right, Phase::Down),
        WM_RBUTTONUP => (MouseButton::Right, Phase::Up),
        WM_MBUTTONDOWN => (MouseButton::Middle, Phase::Down),
        WM_MBUTTONUP => (MouseButton::Middle, Phase::Up),
        _ => return None,
    };
    Some(RawInput::Mouse { button, phase })
}

fn vk_u32(vk: VIRTUAL_KEY) -> u32 {
    u32::from(vk.0)
}

fn key_id(vk_code: u32, scan: u32, extended: bool) -> Option<(String, bool)> {
    let vk = resolve_modifier_vk(vk_code, scan, extended);

    let mapped: Option<(&str, bool)> = match vk {
        x if x == vk_u32(VK_LCONTROL) => Some(("ControlLeft", true)),
        x if x == vk_u32(VK_RCONTROL) => Some(("ControlRight", true)),
        x if x == vk_u32(VK_LMENU) => Some(("AltLeft", true)),
        x if x == vk_u32(VK_RMENU) => Some(("AltRight", true)),
        x if x == vk_u32(VK_LSHIFT) => Some(("ShiftLeft", true)),
        x if x == vk_u32(VK_RSHIFT) => Some(("ShiftRight", true)),
        x if x == vk_u32(VK_LWIN) => Some(("MetaLeft", true)),
        x if x == vk_u32(VK_RWIN) => Some(("MetaRight", true)),
        x if x == vk_u32(VK_CONTROL) => Some(("ControlLeft", true)),
        x if x == vk_u32(VK_MENU) => Some(("AltLeft", true)),
        x if x == vk_u32(VK_SHIFT) => Some(("ShiftLeft", true)),

        x if x == vk_u32(VK_ESCAPE) => Some(("Escape", false)),
        x if x == vk_u32(VK_TAB) => Some(("Tab", false)),
        x if x == vk_u32(VK_CAPITAL) => Some(("CapsLock", false)),
        x if x == vk_u32(VK_SPACE) => Some(("Space", false)),
        x if x == vk_u32(VK_BACK) => Some(("Backspace", false)),
        x if x == vk_u32(VK_RETURN) => {
            if extended {
                Some(("NumpadEnter", false))
            } else {
                Some(("Enter", false))
            }
        }
        x if x == vk_u32(VK_DELETE) => Some(("ForwardDelete", false)),
        x if x == vk_u32(VK_INSERT) => Some(("Insert", false)),
        x if x == vk_u32(VK_HOME) => Some(("Home", false)),
        x if x == vk_u32(VK_END) => Some(("End", false)),
        x if x == vk_u32(VK_PRIOR) => Some(("PageUp", false)),
        x if x == vk_u32(VK_NEXT) => Some(("PageDown", false)),
        x if x == vk_u32(VK_LEFT) => Some(("ArrowLeft", false)),
        x if x == vk_u32(VK_RIGHT) => Some(("ArrowRight", false)),
        x if x == vk_u32(VK_UP) => Some(("ArrowUp", false)),
        x if x == vk_u32(VK_DOWN) => Some(("ArrowDown", false)),
        x if x == vk_u32(VK_SNAPSHOT) => Some(("PrintScreen", false)),
        x if x == vk_u32(VK_APPS) => Some(("ContextMenu", false)),
        x if x == vk_u32(VK_NUMLOCK) => Some(("NumLock", false)),

        x if x == vk_u32(VK_OEM_3) => Some(("Backquote", false)),
        x if x == vk_u32(VK_OEM_MINUS) => Some(("Minus", false)),
        x if x == vk_u32(VK_OEM_PLUS) => Some(("Equal", false)),
        x if x == vk_u32(VK_OEM_4) => Some(("BracketLeft", false)),
        x if x == vk_u32(VK_OEM_6) => Some(("BracketRight", false)),
        x if x == vk_u32(VK_OEM_5) => Some(("Backslash", false)),
        x if x == vk_u32(VK_OEM_1) => Some(("Semicolon", false)),
        x if x == vk_u32(VK_OEM_7) => Some(("Quote", false)),
        x if x == vk_u32(VK_OEM_COMMA) => Some(("Comma", false)),
        x if x == vk_u32(VK_OEM_PERIOD) => Some(("Period", false)),
        x if x == vk_u32(VK_OEM_2) => Some(("Slash", false)),

        x if x == vk_u32(VK_NUMPAD0) => Some(("Numpad0", false)),
        x if x == vk_u32(VK_NUMPAD1) => Some(("Numpad1", false)),
        x if x == vk_u32(VK_NUMPAD2) => Some(("Numpad2", false)),
        x if x == vk_u32(VK_NUMPAD3) => Some(("Numpad3", false)),
        x if x == vk_u32(VK_NUMPAD4) => Some(("Numpad4", false)),
        x if x == vk_u32(VK_NUMPAD5) => Some(("Numpad5", false)),
        x if x == vk_u32(VK_NUMPAD6) => Some(("Numpad6", false)),
        x if x == vk_u32(VK_NUMPAD7) => Some(("Numpad7", false)),
        x if x == vk_u32(VK_NUMPAD8) => Some(("Numpad8", false)),
        x if x == vk_u32(VK_NUMPAD9) => Some(("Numpad9", false)),
        x if x == vk_u32(VK_DECIMAL) => Some(("NumpadDecimal", false)),
        x if x == vk_u32(VK_ADD) => Some(("NumpadAdd", false)),
        x if x == vk_u32(VK_SUBTRACT) => Some(("NumpadSubtract", false)),
        x if x == vk_u32(VK_MULTIPLY) => Some(("NumpadMultiply", false)),
        x if x == vk_u32(VK_DIVIDE) => Some(("NumpadDivide", false)),

        x if x == vk_u32(VK_F1) => Some(("F1", false)),
        x if x == vk_u32(VK_F2) => Some(("F2", false)),
        x if x == vk_u32(VK_F3) => Some(("F3", false)),
        x if x == vk_u32(VK_F4) => Some(("F4", false)),
        x if x == vk_u32(VK_F5) => Some(("F5", false)),
        x if x == vk_u32(VK_F6) => Some(("F6", false)),
        x if x == vk_u32(VK_F7) => Some(("F7", false)),
        x if x == vk_u32(VK_F8) => Some(("F8", false)),
        x if x == vk_u32(VK_F9) => Some(("F9", false)),
        x if x == vk_u32(VK_F10) => Some(("F10", false)),
        x if x == vk_u32(VK_F11) => Some(("F11", false)),
        x if x == vk_u32(VK_F12) => Some(("F12", false)),
        x if x == vk_u32(VK_F13) => Some(("F13", false)),
        x if x == vk_u32(VK_F14) => Some(("F14", false)),
        x if x == vk_u32(VK_F15) => Some(("F15", false)),
        x if x == vk_u32(VK_F16) => Some(("F16", false)),
        x if x == vk_u32(VK_F17) => Some(("F17", false)),
        x if x == vk_u32(VK_F18) => Some(("F18", false)),
        x if x == vk_u32(VK_F19) => Some(("F19", false)),
        x if x == vk_u32(VK_F20) => Some(("F20", false)),

        0x30..=0x39 => {
            let d = (vk - 0x30) as u8;
            return Some((format!("Digit{d}"), false));
        }
        0x41..=0x5A => {
            let ch = char::from_u32(vk).unwrap_or('?');
            return Some((format!("Key{ch}"), false));
        }
        _ => None,
    };

    mapped.map(|(id, is_mod)| (id.to_string(), is_mod))
}

fn resolve_modifier_vk(vk: u32, scan: u32, extended: bool) -> u32 {
    if vk == vk_u32(VK_SHIFT) || vk == vk_u32(VK_CONTROL) || vk == vk_u32(VK_MENU) {
        let sc = if scan != 0 {
            scan
        } else {
            unsafe { MapVirtualKeyW(vk, MAPVK_VK_TO_VSC) }
        };
        return match (vk, sc, extended) {
            (v, 0x36, _) if v == vk_u32(VK_SHIFT) => vk_u32(VK_RSHIFT),
            (v, _, _) if v == vk_u32(VK_SHIFT) => vk_u32(VK_LSHIFT),
            (v, _, true) if v == vk_u32(VK_CONTROL) => vk_u32(VK_RCONTROL),
            (v, _, false) if v == vk_u32(VK_CONTROL) => vk_u32(VK_LCONTROL),
            (v, _, true) if v == vk_u32(VK_MENU) => vk_u32(VK_RMENU),
            (v, _, false) if v == vk_u32(VK_MENU) => vk_u32(VK_LMENU),
            _ => vk,
        };
    }
    vk
}
