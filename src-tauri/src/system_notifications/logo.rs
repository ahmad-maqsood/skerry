//! Application logo extraction and cache.
//!
//! Tries WinRT `AppInfo.DisplayInfo().GetLogo(...)` first, and falls back to
//! shell or executable icon resolution.

use std::{
    collections::HashMap,
    io::Cursor,
    sync::{Mutex, PoisonError},
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{ImageFormat, RgbaImage};
use windows::{
    ApplicationModel::AppInfo,
    Foundation::Size,
    Storage::Streams::DataReader,
};

static LOGO_CACHE: Mutex<Option<HashMap<String, Option<String>>>> = Mutex::new(None);
const MAX_CACHED_LOGOS: usize = 128;

pub fn get_or_extract_app_logo(app: &AppInfo, app_id: &str) -> Option<String> {
    let key = app_id.to_lowercase();
    if let Some(cached) = LOGO_CACHE
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .as_ref()
        .and_then(|cache| cache.get(&key))
    {
        return cached.clone();
    }

    let logo = extract_app_logo(app, app_id);
    let mut guard = LOGO_CACHE.lock().unwrap_or_else(PoisonError::into_inner);
    let cache = guard.get_or_insert_with(HashMap::new);
    if cache.len() >= MAX_CACHED_LOGOS {
        cache.clear();
    }
    cache.insert(key, logo.clone());
    logo
}

fn extract_app_logo(app: &AppInfo, app_id: &str) -> Option<String> {
    // 1. Try WinRT AppInfo.DisplayInfo().GetLogo(...)
    if let Ok(display_info) = app.DisplayInfo() {
        if let Ok(stream_ref) = display_info.GetLogo(Size {
            Width: 32.0,
            Height: 32.0,
        }) {
            if let Ok(stream_op) = stream_ref.OpenReadAsync() {
                if let Ok(stream) = pollster::block_on(stream_op) {
                    if let Ok(size) = stream.Size() {
                        if size > 0 && size <= 2 * 1024 * 1024 {
                            if let Ok(reader) = DataReader::CreateDataReader(&stream) {
                                if reader.LoadAsync(size as u32).is_ok_and(|load| pollster::block_on(load).is_ok()) {
                                    let mut buffer = vec![0u8; size as usize];
                                    if reader.ReadBytes(&mut buffer).is_ok() {
                                        if let Ok(img) = image::load_from_memory(&buffer) {
                                            let resized = if img.width() > 48 || img.height() > 48 {
                                                img.resize(
                                                    32,
                                                    32,
                                                    image::imageops::FilterType::Lanczos3,
                                                )
                                            } else {
                                                img
                                            };
                                            let mut png = Cursor::new(Vec::new());
                                            if resized.write_to(&mut png, ImageFormat::Png).is_ok()
                                            {
                                                return Some(format!(
                                                    "data:image/png;base64,{}",
                                                    STANDARD.encode(png.into_inner())
                                                ));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Fallback: try shell icon if app_id is an executable or shell path
    if let Some(pixels) =
        crate::win32::icon::shell_icon(app_id, crate::win32::icon::ShellIconSource::FileType)
            .or_else(|| crate::win32::icon::exe_icon(app_id))
    {
        if let Some(rgba) = RgbaImage::from_raw(pixels.width, pixels.height, pixels.rgba) {
            let mut png = Cursor::new(Vec::new());
            if rgba.write_to(&mut png, ImageFormat::Png).is_ok() {
                return Some(format!(
                    "data:image/png;base64,{}",
                    STANDARD.encode(png.into_inner())
                ));
            }
        }
    }

    None
}
