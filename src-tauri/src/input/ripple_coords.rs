//! Primary-monitor local CSS px from screen physical points (Windows ripple mapping).

/// Map a screen physical point into primary-monitor top-left CSS/logical px.
///
/// Returns `None` when the point lies outside the primary's physical bounds.
/// No Y flip — same top-left space as the ripple webview CSS `left`/`top`.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
pub(crate) fn primary_local_from_screen_phys(
    screen_x: f64,
    screen_y: f64,
    origin_x: f64,
    origin_y: f64,
    size_w: f64,
    size_h: f64,
    scale_factor: f64,
) -> Option<(f64, f64)> {
    if scale_factor <= 0.0 {
        return None;
    }
    let local_phys_x = screen_x - origin_x;
    let local_phys_y = screen_y - origin_y;
    if local_phys_x < 0.0
        || local_phys_y < 0.0
        || local_phys_x >= size_w
        || local_phys_y >= size_h
    {
        return None;
    }
    Some((local_phys_x / scale_factor, local_phys_y / scale_factor))
}

#[cfg(test)]
mod tests {
    use super::primary_local_from_screen_phys;

    #[test]
    fn in_bounds_scale_1() {
        let (x, y) =
            primary_local_from_screen_phys(100.0, 200.0, 0.0, 0.0, 1920.0, 1080.0, 1.0).unwrap();
        assert!((x - 100.0).abs() < f64::EPSILON);
        assert!((y - 200.0).abs() < f64::EPSILON);
    }

    #[test]
    fn outside_primary_returns_none() {
        assert!(
            primary_local_from_screen_phys(2000.0, 100.0, 0.0, 0.0, 1920.0, 1080.0, 1.0).is_none()
        );
        assert!(
            primary_local_from_screen_phys(-1.0, 100.0, 0.0, 0.0, 1920.0, 1080.0, 1.0).is_none()
        );
        assert!(
            primary_local_from_screen_phys(100.0, 1080.0, 0.0, 0.0, 1920.0, 1080.0, 1.0).is_none()
        );
    }

    #[test]
    fn scale_1_25() {
        // 125% DPI: physical 250×125 → CSS 200×100
        let (x, y) =
            primary_local_from_screen_phys(250.0, 125.0, 0.0, 0.0, 2400.0, 1350.0, 1.25).unwrap();
        assert!((x - 200.0).abs() < 1e-9);
        assert!((y - 100.0).abs() < 1e-9);
    }

    #[test]
    fn scale_1_5() {
        let (x, y) =
            primary_local_from_screen_phys(300.0, 150.0, 0.0, 0.0, 2880.0, 1620.0, 1.5).unwrap();
        assert!((x - 200.0).abs() < 1e-9);
        assert!((y - 100.0).abs() < 1e-9);
    }

    #[test]
    fn negative_monitor_origin() {
        // Primary at (-1920, 0) with size 1920×1080 — common multi-monitor layout.
        let (x, y) =
            primary_local_from_screen_phys(-100.0, 50.0, -1920.0, 0.0, 1920.0, 1080.0, 1.0)
                .unwrap();
        assert!((x - 1820.0).abs() < f64::EPSILON);
        assert!((y - 50.0).abs() < f64::EPSILON);

        // Point on a secondary at (0,0) while primary is at (-1920,0) → OOB.
        assert!(
            primary_local_from_screen_phys(100.0, 50.0, -1920.0, 0.0, 1920.0, 1080.0, 1.0)
                .is_none()
        );
    }
}
