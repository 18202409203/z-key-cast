use std::time::{Duration, Instant};

use super::event::{Phase, RawInput};

/// Drops obvious same-key spam before the chip reducer.
pub struct EventFilter {
    last_key_down: Option<(String, Instant)>,
    min_key_down_interval: Duration,
}

impl Default for EventFilter {
    fn default() -> Self {
        Self {
            last_key_down: None,
            min_key_down_interval: Duration::from_millis(35),
        }
    }
}

impl EventFilter {
    /// Returns true when the raw event should reach the chip reducer.
    pub fn allow(&mut self, event: &RawInput) -> bool {
        match event {
            // Modifier state must always reach the reducer.
            RawInput::Key {
                is_modifier: true, ..
            } => true,
            RawInput::Key {
                key,
                phase: Phase::Down,
                is_modifier: false,
            } => {
                let now = Instant::now();
                if let Some((prev_id, prev_at)) = &self.last_key_down {
                    if prev_id == &key.id
                        && now.duration_since(*prev_at) < self.min_key_down_interval
                    {
                        return false;
                    }
                }
                self.last_key_down = Some((key.id.clone(), now));
                true
            }
            RawInput::Key {
                phase: Phase::Up, ..
            }
            | RawInput::Mouse { .. } => true,
        }
    }
}
