fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=../release-features.json");
    let features: serde_json::Value = serde_json::from_str(include_str!("../release-features.json"))?;
    println!("cargo:rustc-check-cfg=cfg(skerry_plugins)");
    if features["plugins"].as_bool().ok_or("release feature must be a boolean")? {
        println!("cargo:rustc-cfg=skerry_plugins");
    }
    tauri_build::build();
    println!("cargo:rustc-link-arg=/DELAYLOAD:comctl32.dll");
    println!("cargo:rustc-link-lib=delayimp");
    Ok(())
}
