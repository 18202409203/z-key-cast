use std::time::{Duration, Instant};

use super::event::{Phase, RawInput, ScrollDirection};

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
            | RawInput::Mouse { .. }
            | RawInput::Scroll { .. } => true,
        }
    }
}

/// Leading-edge coalesce for vertical scroll bursts (~64ms window).
///
/// Emits the first tick of a same-direction burst; drops subsequent ticks
/// within the window; emits immediately on direction flip.
pub struct ScrollCoalescer {
    last: Option<(ScrollDirection, Instant)>,
    window: Duration,
}

impl Default for ScrollCoalescer {
    fn default() -> Self {
        Self {
            last: None,
            window: Duration::from_millis(64),
        }
    }
}

impl ScrollCoalescer {
    pub fn allow(&mut self, direction: ScrollDirection) -> bool {
        self.allow_at(direction, Instant::now())
    }

    pub(crate) fn allow_at(&mut self, direction: ScrollDirection, now: Instant) -> bool {
        if let Some((prev, at)) = self.last {
            if prev == direction && now.duration_since(at) < self.window {
                return false;
            }
        }
        self.last = Some((direction, now));
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scroll_coalesce_drops_same_direction_within_window() {
        let mut c = ScrollCoalescer::default();
        let t0 = Instant::now();
        assert!(c.allow_at(ScrollDirection::Up, t0));
        assert!(!c.allow_at(ScrollDirection::Up, t0 + Duration::from_millis(20)));
        assert!(!c.allow_at(ScrollDirection::Up, t0 + Duration::from_millis(50)));
        assert!(c.allow_at(ScrollDirection::Up, t0 + Duration::from_millis(70)));
    }

    #[test]
    fn scroll_coalesce_emits_on_direction_flip() {
        let mut c = ScrollCoalescer::default();
        let t0 = Instant::now();
        assert!(c.allow_at(ScrollDirection::Up, t0));
        assert!(c.allow_at(ScrollDirection::Down, t0 + Duration::from_millis(10)));
        assert!(!c.allow_at(ScrollDirection::Down, t0 + Duration::from_millis(20)));
        assert!(c.allow_at(ScrollDirection::Up, t0 + Duration::from_millis(30)));
    }
}
