use std::time::{Duration, Instant};

use super::event::{CastEvent, Phase};

/// Drops key-repeat and obvious same-key spam before emit.
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
    /// Returns true when the event should be emitted.
    pub fn allow(&mut self, event: &CastEvent) -> bool {
        match event {
            CastEvent::Key {
                key,
                phase: Phase::Down,
                ..
            } => {
                let now = Instant::now();
                if let Some((prev_key, prev_at)) = &self.last_key_down {
                    if prev_key == key && now.duration_since(*prev_at) < self.min_key_down_interval
                    {
                        return false;
                    }
                }
                self.last_key_down = Some((key.clone(), now));
                true
            }
            CastEvent::Key {
                phase: Phase::Up, ..
            }
            | CastEvent::Mouse { .. } => true,
        }
    }
}
