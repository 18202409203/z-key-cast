use super::event::{HudChip, KeyRef, Phase, RawInput, ScrollDirection};

/// Turns filtered raw downs/ups into public `HudChip` payloads.
///
/// Always emits precise down/up (including bare modifiers and mouse ups).
/// Consumers decide what to show: Text/Lite ignore ups and bare-mod downs;
/// Full maintains held sets from every phase.
#[derive(Debug, Default)]
pub struct ChipReducer {
    held_mods: Vec<KeyRef>,
}

impl ChipReducer {
    pub fn is_holding(&self, id: &str) -> bool {
        self.held_mods.iter().any(|m| m.id == id)
    }

    fn mods_excluding(&self, id: &str) -> Vec<KeyRef> {
        self.held_mods
            .iter()
            .filter(|m| m.id != id)
            .cloned()
            .collect()
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
                        // Exclude self so `key` is the actor.
                        Some(HudChip::Key {
                            mods: self.mods_excluding(&key.id),
                            key: key.clone(),
                            phase: Phase::Down,
                        })
                    }
                    Phase::Up => {
                        self.held_mods.retain(|m| m.id != key.id);
                        Some(HudChip::Key {
                            mods: self.held_mods.clone(),
                            key: key.clone(),
                            phase: Phase::Up,
                        })
                    }
                }
            }
            RawInput::Key {
                key,
                phase: Phase::Down,
                is_modifier: false,
            } => Some(HudChip::Key {
                mods: self.held_mods.clone(),
                key: key.clone(),
                phase: Phase::Down,
            }),
            RawInput::Key {
                key,
                phase: Phase::Up,
                is_modifier: false,
            } => Some(HudChip::Key {
                mods: self.held_mods.clone(),
                key: key.clone(),
                phase: Phase::Up,
            }),
            RawInput::Mouse { button, phase } => Some(HudChip::Mouse {
                button: *button,
                phase: *phase,
            }),
            RawInput::Scroll { direction } => Some(HudChip::Scroll {
                direction: *direction,
            }),
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

    fn key(id: &str) -> KeyRef {
        KeyRef::new(id)
    }

    #[test]
    fn bare_modifier_down_emits_with_phase() {
        let mut r = ChipReducer::default();
        let chip = r.reduce(&RawInput::Key {
            key: key("MetaLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        match chip {
            Some(HudChip::Key {
                mods,
                key,
                phase: Phase::Down,
            }) => {
                assert_eq!(key.id, "MetaLeft");
                assert!(mods.is_empty());
            }
            other => panic!("expected bare mod down, got {other:?}"),
        }
        assert!(r.is_holding("MetaLeft"));
    }

    #[test]
    fn bare_modifier_up_emits() {
        let mut r = ChipReducer::default();
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let chip = r.reduce(&RawInput::Key {
            key: key("MetaLeft"),
            phase: Phase::Up,
            is_modifier: true,
        });
        match chip {
            Some(HudChip::Key {
                key,
                phase: Phase::Up,
                ..
            }) => {
                assert_eq!(key.id, "MetaLeft");
            }
            other => panic!("expected bare mod up, got {other:?}"),
        }
        assert!(!r.is_holding("MetaLeft"));
    }

    #[test]
    fn primary_down_snapshots_mods() {
        let mut r = ChipReducer::default();
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let _ = r.reduce(&RawInput::Key {
            key: key("ShiftLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let chip = r.reduce(&RawInput::Key {
            key: key("KeyS"),
            phase: Phase::Down,
            is_modifier: false,
        });
        match chip {
            Some(HudChip::Key { mods, key, phase }) => {
                assert_eq!(key.id, "KeyS");
                assert_eq!(phase, Phase::Down);
                assert_eq!(
                    mods.iter().map(|m| m.id.as_str()).collect::<Vec<_>>(),
                    vec!["ShiftLeft", "MetaLeft"]
                );
            }
            other => panic!("expected key chip, got {other:?}"),
        }
    }

    #[test]
    fn key_up_and_mouse_up_emit() {
        let mut r = ChipReducer::default();
        let key_up = r.reduce(&RawInput::Key {
            key: key("KeyA"),
            phase: Phase::Up,
            is_modifier: false,
        });
        assert!(matches!(
            key_up,
            Some(HudChip::Key {
                phase: Phase::Up,
                ..
            })
        ));
        let mouse_up = r.reduce(&RawInput::Mouse {
            button: MouseButton::Left,
            phase: Phase::Up,
        });
        assert!(matches!(
            mouse_up,
            Some(HudChip::Mouse {
                button: MouseButton::Left,
                phase: Phase::Up,
            })
        ));
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
                button: MouseButton::Right,
                phase: Phase::Down,
            })
        ));
    }

    #[test]
    fn scroll_emits_without_phase() {
        let mut r = ChipReducer::default();
        let chip = r.reduce(&RawInput::Scroll {
            direction: ScrollDirection::Up,
        });
        assert!(matches!(
            chip,
            Some(HudChip::Scroll {
                direction: ScrollDirection::Up,
            })
        ));
        let down = r.reduce(&RawInput::Scroll {
            direction: ScrollDirection::Down,
        });
        assert!(matches!(
            down,
            Some(HudChip::Scroll {
                direction: ScrollDirection::Down,
            })
        ));
    }

    #[test]
    fn bare_mod_excludes_self_from_mods() {
        let mut r = ChipReducer::default();
        let _ = r.reduce(&RawInput::Key {
            key: key("ShiftLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let chip = r.reduce(&RawInput::Key {
            key: key("MetaLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        match chip {
            Some(HudChip::Key { mods, key, .. }) => {
                assert_eq!(key.id, "MetaLeft");
                assert_eq!(
                    mods.iter().map(|m| m.id.as_str()).collect::<Vec<_>>(),
                    vec!["ShiftLeft"]
                );
            }
            other => panic!("expected mod chord, got {other:?}"),
        }
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
            key: key("MetaLeft"),
            phase: Phase::Down,
            is_modifier: true,
        });
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaRight"),
            phase: Phase::Down,
            is_modifier: true,
        });
        // Shared Command flag still on → still Up for the released side.
        let phase = modifier_transition(true, r.is_holding("MetaLeft"));
        let _ = r.reduce(&RawInput::Key {
            key: key("MetaLeft"),
            phase,
            is_modifier: true,
        });
        assert!(!r.is_holding("MetaLeft"));
        assert!(r.is_holding("MetaRight"));
    }
}
