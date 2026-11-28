//! A muted, looping video drawn into a window by Windows' own engine (Media Foundation's
//! `IMFMediaEngine`). The original file is decoded, on the GPU where the driver can, and scaled
//! straight to the window: nothing is converted or re-encoded.

use std::{
    marker::PhantomData,
    sync::{
        atomic::{AtomicBool, AtomicU32, Ordering},
        Arc,
    },
};

use windows::{
    core::{implement, w, Interface, BSTR, HSTRING, PCWSTR},
    Win32::{
        Foundation::{HMODULE, RECT},
        Graphics::{
            Direct3D::D3D_DRIVER_TYPE_HARDWARE,
            Direct3D10::ID3D10Multithread,
            Direct3D11::{
                D3D11CreateDevice, ID3D11Device, D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                D3D11_CREATE_DEVICE_VIDEO_SUPPORT, D3D11_SDK_VERSION,
            },
            Dxgi::Common::DXGI_FORMAT_B8G8R8A8_UNORM,
        },
        Media::MediaFoundation::{
            CLSID_MFMediaEngineClassFactory, IMFAttributes, IMFDXGIDeviceManager,
            IMFMediaEngine, IMFMediaEngineClassFactory, IMFMediaEngineEx, IMFMediaEngineNotify,
            IMFMediaEngineNotify_Impl, MFCreateAttributes, MFCreateDXGIDeviceManager, MFCreateFile,
            MFShutdown, MFStartup, MFVideoNormalizedRect, MFARGB, MFSTARTUP_FULL,
            MF_ACCESSMODE_READ, MF_FILEFLAGS_NONE, MF_MEDIA_ENGINE_CALLBACK,
            MF_MEDIA_ENGINE_DXGI_MANAGER, MF_MEDIA_ENGINE_EVENT_ERROR,
            MF_MEDIA_ENGINE_EVENT_LOADEDMETADATA, MF_MEDIA_ENGINE_PLAYBACK_HWND,
            MF_MEDIA_ENGINE_VIDEO_OUTPUT_FORMAT, MF_OPENMODE_FAIL_IF_NOT_EXIST, MF_VERSION,
        },
        System::{
            Com::{CoCreateInstance, CLSCTX_INPROC_SERVER},
            LibraryLoader::{LoadLibraryExW, LOAD_LIBRARY_SEARCH_SYSTEM32},
        },
    },
};

use super::com::ComApartment;

/// COM and Media Foundation, started for this thread. Keep it alive longer than every player.
pub(crate) struct MediaRuntime {
    // Dropped after `drop` below has shut Media Foundation down.
    _com: ComApartment,
}

impl MediaRuntime {
    pub(crate) fn start() -> Result<Self, String> {
        // mfplat.dll is delay-loaded (build.rs): Windows "N" editions lack it until the Media
        // Feature Pack is added, and calling into a missing delay-loaded DLL would end the app.
        // SAFETY: a constant NUL-terminated name, looked up in System32 only.
        unsafe { LoadLibraryExW(w!("mfplat.dll"), None, LOAD_LIBRARY_SEARCH_SYSTEM32) }
            .map_err(|_| "Windows media features are missing. Install the Media Feature Pack.".to_string())?;
        let com = ComApartment::multithreaded().map_err(|error| error.to_string())?;
        // SAFETY: takes plain values; paired with MFShutdown in Drop.
        unsafe { MFStartup(MF_VERSION, MFSTARTUP_FULL) }.map_err(|error| error.to_string())?;
        Ok(Self { _com: com })
    }
}

impl Drop for MediaRuntime {
    fn drop(&mut self) {
        // SAFETY: pairs the successful MFStartup in `start`.
        let _ = unsafe { MFShutdown() };
    }
}

/// What the engine reported, written from its own threads.
#[derive(Default)]
struct Events {
    loaded: AtomicBool,
    /// An `MF_MEDIA_ENGINE_ERR` code; 0 for none.
    error: AtomicU32,
}

#[implement(IMFMediaEngineNotify)]
struct Notify(Arc<Events>);

impl IMFMediaEngineNotify_Impl for Notify_Impl {
    fn EventNotify(&self, event: u32, param1: usize, _: u32) -> windows::core::Result<()> {
        if event == MF_MEDIA_ENGINE_EVENT_LOADEDMETADATA.0 as u32 {
            self.0.loaded.store(true, Ordering::SeqCst);
        } else if event == MF_MEDIA_ENGINE_EVENT_ERROR.0 as u32 {
            self.0.error.store((param1 as u32).max(1), Ordering::SeqCst);
        }
        Ok(())
    }
}

/// A Direct3D device the decoder can share, which is what turns hardware decoding on.
fn device_manager() -> windows::core::Result<IMFDXGIDeviceManager> {
    let mut device: Option<ID3D11Device> = None;
    // SAFETY: the out pointer is a valid local; no adapter or software module is passed.
    unsafe {
        D3D11CreateDevice(None, D3D_DRIVER_TYPE_HARDWARE, HMODULE::default(),
            D3D11_CREATE_DEVICE_BGRA_SUPPORT | D3D11_CREATE_DEVICE_VIDEO_SUPPORT, None,
            D3D11_SDK_VERSION, Some(&mut device), None, None)?;
    }
    let device = device.ok_or_else(|| windows::core::Error::from_hresult(windows::Win32::Foundation::E_FAIL))?;
    // SAFETY: the media threads use the device too, so it must lock itself; the manager and token
    // are valid locals.
    unsafe {
        let _ = device.cast::<ID3D10Multithread>()?.SetMultithreadProtected(true);
        let mut token = 0;
        let mut manager = None;
        MFCreateDXGIDeviceManager(&mut token, &mut manager)?;
        let manager = manager.ok_or_else(|| windows::core::Error::from_hresult(windows::Win32::Foundation::E_FAIL))?;
        manager.ResetDevice(&device, token)?;
        Ok(manager)
    }
}

pub(crate) struct VideoPlayer {
    engine: IMFMediaEngine,
    events: Arc<Events>,
    _thread_bound: PhantomData<*const ()>,
}

impl VideoPlayer {
    /// Opens `path` to be drawn into `window`, paused until [`VideoPlayer::set_playing`].
    pub(crate) fn open(_runtime: &MediaRuntime, window: isize, path: &str) -> Result<Self, String> {
        let events = Arc::new(Events::default());
        Self::create(window, path, events).map_err(|error| format!("Could not open the video: {error}"))
    }

    fn create(window: isize, path: &str, events: Arc<Events>) -> windows::core::Result<Self> {
        let notify: IMFMediaEngineNotify = Notify(events.clone()).into();
        // A software-only machine (or a remote session) still plays, decoding on the processor.
        let manager = device_manager().ok();
        let mut attributes: Option<IMFAttributes> = None;
        // SAFETY: COM and Media Foundation are running on this thread (the caller holds a
        // MediaRuntime). Every pointer is a valid local or an interface alive for the call.
        let engine = unsafe {
            MFCreateAttributes(&mut attributes, 4)?;
            let attributes = attributes
                .ok_or_else(|| windows::core::Error::from_hresult(windows::Win32::Foundation::E_FAIL))?;
            attributes.SetUnknown(&MF_MEDIA_ENGINE_CALLBACK, &notify)?;
            if let Some(manager) = &manager {
                attributes.SetUnknown(&MF_MEDIA_ENGINE_DXGI_MANAGER, manager)?;
            }
            attributes.SetUINT64(&MF_MEDIA_ENGINE_PLAYBACK_HWND, window as u64)?;
            attributes.SetUINT32(&MF_MEDIA_ENGINE_VIDEO_OUTPUT_FORMAT, DXGI_FORMAT_B8G8R8A8_UNORM.0 as u32)?;
            let factory: IMFMediaEngineClassFactory =
                CoCreateInstance(&CLSID_MFMediaEngineClassFactory, None, CLSCTX_INPROC_SERVER)?;
            factory.CreateInstance(0, &attributes)?
        };
        let player = Self { engine, events, _thread_bound: PhantomData };
        let name = HSTRING::from(path);
        // SAFETY: `name` outlives the calls. The file is handed over as a byte stream so that
        // characters such as # or % in its path are never read as parts of a URL.
        unsafe {
            player.engine.SetMuted(true)?;
            player.engine.SetLoop(true)?;
            player.engine.SetAutoPlay(false)?;
            let stream = MFCreateFile(MF_ACCESSMODE_READ, MF_OPENMODE_FAIL_IF_NOT_EXIST,
                MF_FILEFLAGS_NONE, PCWSTR(name.as_ptr()))?;
            player.engine.cast::<IMFMediaEngineEx>()?.SetSourceFromByteStream(&stream, &BSTR::from(path))?;
        }
        Ok(player)
    }

    /// The video's size and layout are known.
    pub(crate) fn is_loaded(&self) -> bool {
        self.events.loaded.load(Ordering::SeqCst)
    }

    /// The `MF_MEDIA_ENGINE_ERR` code playback stopped with.
    pub(crate) fn error_code(&self) -> Option<u32> {
        Some(self.events.error.load(Ordering::SeqCst)).filter(|code| *code != 0)
    }

    /// Plays or pauses. Pausing keeps the position and the frame on screen.
    pub(crate) fn set_playing(&self, playing: bool) {
        // SAFETY: plain calls on an engine owned by this thread; failures surface as error events.
        unsafe {
            if playing && self.engine.IsPaused().as_bool() {
                let _ = self.engine.Play();
            } else if !playing && !self.engine.IsPaused().as_bool() {
                let _ = self.engine.Pause();
            }
        }
    }

    /// Seconds from the start.
    pub(crate) fn position(&self) -> f64 {
        // SAFETY: takes no arguments.
        unsafe { self.engine.GetCurrentTime() }
    }

    pub(crate) fn seek(&self, seconds: f64) {
        // SAFETY: takes a plain value.
        let _ = unsafe { self.engine.SetCurrentTime(seconds) };
    }

    /// The picture's own size in pixels, once loaded.
    pub(crate) fn video_size(&self) -> Option<(u32, u32)> {
        let (mut width, mut height) = (0, 0);
        // SAFETY: both out pointers are valid locals.
        unsafe { self.engine.GetNativeVideoSize(Some(&mut width), Some(&mut height)) }.ok()?;
        (width > 0 && height > 0).then_some((width, height))
    }

    /// Draws the part `source` (left, top, right, bottom as fractions of the picture) into a
    /// `width` by `height` area, with black around whatever it does not fill.
    pub(crate) fn set_layout(&self, source: [f32; 4], width: i32, height: i32) {
        let source = MFVideoNormalizedRect { left: source[0], top: source[1], right: source[2], bottom: source[3] };
        let target = RECT { left: 0, top: 0, right: width, bottom: height };
        let black = MFARGB { rgbBlue: 0, rgbGreen: 0, rgbRed: 0, rgbAlpha: 255 };
        // SAFETY: the three pointers are valid locals for the duration of the call.
        let _ = unsafe {
            self.engine.cast::<IMFMediaEngineEx>().and_then(|engine| {
                engine.UpdateVideoStream(Some(&source), Some(&target), Some(&black))
            })
        };
    }
}

impl Drop for VideoPlayer {
    fn drop(&mut self) {
        // SAFETY: stops the engine's threads and releases the file before the window goes.
        let _ = unsafe { self.engine.Shutdown() };
    }
}
