fn main() {
    // Dev Dock icon comes from icon.icns, embedded when generate_context! runs.
    // Cargo will not re-expand that macro unless this crate rebuilds, so stamp
    // the file bytes and rebuild whenever the icon changes.
    println!("cargo:rerun-if-changed=icons/icon.icns");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!(
        "cargo:rustc-env=Z_KEY_CAST_DOCK_ICON_STAMP={}",
        icon_stamp("icons/icon.icns")
    );

    tauri_build::build()
}

fn icon_stamp(path: &str) -> String {
    use std::hash::{Hash, Hasher};

    let bytes = std::fs::read(path).unwrap_or_default();
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    bytes.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}
