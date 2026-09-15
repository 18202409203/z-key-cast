use super::event::{HudChip, KeyRef, Phase, RawInput};

/// Turns filtered raw downs/ups into public `HudChip` payloads.
///
/// Rules: bare modifiers update held state only; primary key / mouse down emit;
/// ups never emit.
#[derive(Debug, Default)]
pub struct ChipReducer {
    held_mods: Vec<KeyRef>,
}

impl ChipReducer {
    pub fn is_holding(&self, id: &str) -> bool {
        self.held_mods.iter().any(|m| m.id == id)
    }

    pub fn reduce(&mut self, raw: &RawInput) -> Option<HudChip> {
        match raw {
            RawInput::Key {
                key,
                phase,
                is_modifier: true,
            } => {
                match phase {
                    Phase::Down => {
                        if !self.is_holding(&key.id) {
                            self.held_mods.push(key.clone());
                            sort_mods(&mut self.held_mods);
                        }
                    }
                    Phase::Up => {
                        self.held_mods.retain(|m| m.id != key.id);
                    }
                }
                None
            }
            RawInput::Key {
                key,
                phase: Phase::Down,
                is_modifier: false,
            } => Some(HudChip::Key {
                mods: self.held_mods.clone(),
                key: key.clone(),
            }),
            RawInput::Key {
                phase: Phase::Up,
                is_modifier: false,
                ..
            } => None,
            RawInput::Mouse {
                button,
                phase: Phase::Down,
            } => Some(HudChip::Mouse {
                button: *button,
            }),
            RawInput::Mouse {
                phase: Phase::Up, ..
            } => None,
        }
    }
}

/// Display order: ⌃ ⌥ ⇧ ⌘ (then any other mod ids).
fn sort_mods(mods: &mut [KeyRef]) {
    mods.sort_by_key(|m| mod_rank(&m.id));
}

fn mod_rank(id: &str) -> u8 {
    if id.starts_with("Control") {
        0
    } else if id.starts_with("Alt") {
        1
    } else if id.starts_with("Shift") {
        2
    } else if id.starts_with("Meta") {
        3
    } else {
        4
    }
}

/// Resolve FlagsChanged for a physical modifier key.
///
/// macOS shares one flag bit across left/right (e.g. both ⌘ keys). When one
/// side is released while the other stays held, the flag remains set — treat
/// that FlagsChanged as Up for the keycode that changed.
pub fn modifier_transition(flag_on: bool, was_held: bool) -> Phase {
    if flag_on && !was_held {
        Phase::Down
    } else {
        Phase::Up
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::input::event::MouseButton;

    fn key(id: &str, label: &str) -> KeyRef {
        KeyRef::new(id, label)
    }

    #[test]
    fn bare_modifier_does_not_emit() {
        let mut r = ChipReducer::default();
        let chip = r.reduce(&RawInput::Key {
            key: key("MetaLeft", "⌘"),
            phase: Phase::Down,
            is_modifier: true,
        });
        assert!(chip.is_none());
    }

    #[test]
    fn primary_down_snapshots_mods() {
        let mut r = ChipReducer::default();
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaLeft", "⌘"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let _ = r.reduce(&RawInput::Key {
            key: key("ShiftLeft", "⇧"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let chip = r.reduce(&RawInput::Key {
            key: key("KeyS", "S"),
            phase: Phase::Down,
            is_modifier: false,
        });
        match chip {
            Some(HudChip::Key { mods, key }) => {
                assert_eq!(key.id, "KeyS");
                assert_eq!(
                    mods.iter().map(|m| m.id.as_str()).collect::<Vec<_>>(),
                    vec!["ShiftLeft", "MetaLeft"]
                );
            }
            other => panic!("expected key chip, got {other:?}"),
        }
    }

    #[test]
    fn key_up_and_mouse_up_do_not_emit() {
        let mut r = ChipReducer::default();
        assert!(r
            .reduce(&RawInput::Key {
                key: key("KeyA", "A"),
                phase: Phase::Up,
                is_modifier: false,
            })
            .is_none());
        assert!(r
            .reduce(&RawInput::Mouse {
                button: MouseButton::Left,
                phase: Phase::Up,
            })
            .is_none());
    }

    #[test]
    fn mouse_down_emits() {
        let mut r = ChipReducer::default();
        let chip = r.reduce(&RawInput::Mouse {
            button: MouseButton::Right,
            phase: Phase::Down,
        });
        assert!(matches!(
            chip,
            Some(HudChip::Mouse {
                button: MouseButton::Right
            })
        ));
    }

    #[test]
    fn modifier_transition_handles_shared_flag_bit() {
        assert_eq!(modifier_transition(true, false), Phase::Down);
        assert_eq!(modifier_transition(false, true), Phase::Up);
        // Release left ⌘ while right ⌘ still held: flag stays on, was_held true → Up.
        assert_eq!(modifier_transition(true, true), Phase::Up);
        assert_eq!(modifier_transition(false, false), Phase::Up);
    }

    #[test]
    fn releasing_one_meta_while_other_held_clears_only_that_side() {
        let mut r = ChipReducer::default();
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaLeft", "⌘"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaRight", "⌘"),
            phase: Phase::Down,
            is_modifier: true,
        });
        // Shared Command flag still on → still Up for the released side.
        let phase = modifier_transition(true, r.is_holding("MetaLeft"));
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaLeft", "⌘"),
            phase,
            is_modifier: true,
        });
        assert!(!r.is_holding("MetaLeft"));
        assert!(r.is_holding("MetaRight"));
    }
}
