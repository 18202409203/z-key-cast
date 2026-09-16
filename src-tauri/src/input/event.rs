use serde::{Deserialize, Serialize};

/// Public HUD chip — keep aligned with `design/index.md` and `src/lib/cast.ts`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum HudChip {
    #[serde(rename = "key")]
    Key {
        mods: Vec<KeyRef>,
        key: KeyRef,
        phase: Phase,
    },
    #[serde(rename = "mouse")]
    Mouse {
        button: MouseButton,
        phase: Phase,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyRef {
    pub id: String,
    pub label: String,
}

impl KeyRef {
    pub fn new(id: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
        }
    }
}

/// Internal raw input (not emitted on `cast://event`).
#[derive(Debug, Clone)]
pub enum RawInput {
    Key {
        key: KeyRef,
        phase: Phase,
        is_modifier: bool,
    },
    Mouse {
        button: MouseButton,
        phase: Phase,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Down,
    Up,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookStatus {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

impl HookStatus {
    pub fn ok() -> Self {
        Self {
            ok: true,
            reason: None,
        }
    }

    pub fn denied(reason: impl Into<String>) -> Self {
        Self {
            ok: false,
            reason: Some(reason.into()),
        }
    }
}

pub const EVENT_CHANNEL: &str = "cast://event";
pub const HOOK_STATUS_CHANNEL: &str = "cast://hook-status";
pub const IGNORE_KEY_CAPTURED_CHANNEL: &str = "cast://ignore-key-captured";
/// Primary-monitor click rings — separate from `cast://event` / HudChip.
pub const MOUSE_RIPPLE_CHANNEL: &str = "cast://mouse-ripple";

/// Payload for `cast://mouse-ripple` (mouse **down** only; primary-monitor local).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MouseRippleEvent {
    /// Logical/CSS px from the primary monitor's top-left (CGEvent global, no Y flip).
    pub x: f64,
    pub y: f64,
    pub button: MouseButton,
}
