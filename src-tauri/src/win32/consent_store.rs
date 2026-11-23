//! Which apps are using the microphone or camera right now, read from the Windows privacy
//! consent store (`HKCU\...\CapabilityAccessManager\ConsentStore\<capability>`).
//!
//! Every app that has asked for a capability has a key there with two QWORD values: when it
//! last started using the device and when it last stopped. While the device is in use the stop
//! time is older than the start time (it is zero for an app that never stopped). Packaged apps
//! sit directly under the capability, classic desktop apps one level down under `NonPackaged`.

use windows::{
    core::{HSTRING, PWSTR},
    Win32::{
        Foundation::ERROR_NO_MORE_ITEMS,
        System::Registry::{
            RegCloseKey, RegEnumKeyExW, RegGetValueW, RegOpenKeyExW, HKEY, HKEY_CURRENT_USER,
            KEY_READ, RRF_RT_REG_QWORD,
        },
    },
};

const CONSENT_STORE: &str =
    r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore";
/// The key that holds classic desktop apps, one level below the capability.
const NON_PACKAGED: &str = "NonPackaged";
/// Registry key names are at most 255 characters; one more unit is the terminating NUL.
const KEY_NAME_UNITS: usize = 256;

/// Whether the timestamps of one app say it is using the device now.
fn is_in_use(last_used_start: u64, last_used_stop: u64) -> bool {
    last_used_start != 0 && last_used_stop < last_used_start
}

/// An open registry key, closed when it goes out of scope.
struct OpenKey(HKEY);

impl OpenKey {
    fn open(subkey: &str) -> Option<Self> {
        let subkey = HSTRING::from(subkey);
        let mut key = HKEY::default();
        // SAFETY: `subkey` is a NUL-terminated wide string that outlives the call, and `key` is a
        // valid pointer to write the opened handle to.
        let result = unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, &subkey, None, KEY_READ, &mut key) };
        result.is_ok().then_some(Self(key))
    }

    /// The names of the subkeys, in registry order. A name that cannot be read is skipped.
    fn subkey_names(&self) -> Vec<String> {
        let mut names = Vec::new();
        let mut index = 0u32;
        loop {
            let mut buffer = [0u16; KEY_NAME_UNITS];
            let mut units = KEY_NAME_UNITS as u32;
            // SAFETY: `self.0` is an open key. `buffer` is a writable buffer of `units` UTF-16
            // units, and `units` is a valid in/out pointer; RegEnumKeyExW writes at most that
            // many units. The optional pointers are all absent.
            let result = unsafe {
                RegEnumKeyExW(
                    self.0,
                    index,
                    Some(PWSTR(buffer.as_mut_ptr())),
                    &mut units,
                    None,
                    None,
                    None,
                    None,
                )
            };
            if result == ERROR_NO_MORE_ITEMS {
                break;
            }
            index += 1;
            if result.is_ok() {
                let length = (units as usize).min(KEY_NAME_UNITS);
                names.push(String::from_utf16_lossy(&buffer[..length]));
            }
        }
        names
    }
}

impl Drop for OpenKey {
    fn drop(&mut self) {
        // SAFETY: `self.0` was opened by `OpenKey::open` and is closed only here.
        let _ = unsafe { RegCloseKey(self.0) };
    }
}

/// A QWORD value of a key under `HKEY_CURRENT_USER`; `None` when it is missing or not a QWORD.
fn read_qword(subkey: &str, value: &str) -> Option<u64> {
    let subkey = HSTRING::from(subkey);
    let value = HSTRING::from(value);
    let mut data = 0u64;
    let mut bytes = size_of::<u64>() as u32;
    // SAFETY: `subkey` and `value` are NUL-terminated wide strings that outlive the call. `data`
    // is a writable buffer of exactly `bytes` bytes, and `bytes` is a valid in/out pointer;
    // RegGetValueW writes at most that many bytes.
    let result = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            &subkey,
            &value,
            RRF_RT_REG_QWORD,
            None,
            Some((&raw mut data).cast()),
            Some(&mut bytes),
        )
    };
    result.is_ok().then_some(data)
}

fn app_in_use(subkey: &str) -> bool {
    let start = read_qword(subkey, "LastUsedTimeStart").unwrap_or(0);
    let stop = read_qword(subkey, "LastUsedTimeStop").unwrap_or(0);
    is_in_use(start, stop)
}

/// True when some app is using the device now. `capability` is the consent store's name for it:
/// `microphone` or `webcam`.
pub(crate) fn capability_in_use(capability: &str) -> bool {
    let root = format!(r"{CONSENT_STORE}\{capability}");
    let Some(key) = OpenKey::open(&root) else {
        return false;
    };
    key.subkey_names().into_iter().any(|name| {
        let path = format!(r"{root}\{name}");
        if name == NON_PACKAGED {
            return OpenKey::open(&path).is_some_and(|inner| {
                inner
                    .subkey_names()
                    .into_iter()
                    .any(|app| app_in_use(&format!(r"{path}\{app}")))
            });
        }
        app_in_use(&path)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_app_is_in_use_from_its_start_until_its_stop() {
        // Started and never stopped: the stop time is zero.
        assert!(is_in_use(133_000_000_000_000_000, 0));
        // Stopped after it started: no longer in use.
        assert!(!is_in_use(133_000_000_000_000_000, 133_000_000_050_000_000));
        // Started again after an earlier stop.
        assert!(is_in_use(133_000_000_100_000_000, 133_000_000_050_000_000));
        // Never used at all.
        assert!(!is_in_use(0, 0));
    }

    #[test]
    fn reading_the_consent_store_never_panics() {
        // The answer depends on the machine; only that it comes back matters.
        let _ = capability_in_use("microphone");
        let _ = capability_in_use("webcam");
        assert!(!capability_in_use("no-such-capability"));
    }
}
